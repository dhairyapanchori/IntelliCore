const defaultPrisma = require('../config/db');
const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');

let pipeline = null;
(async () => {
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  } catch (err) {
    console.error('Failed to load transformers:', err);
  }
})();

/**
 * Strictly parse a positive integer ID. Returns null for malformed values.
 */
function parsePositiveInt(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function createChatController(deps = {}) {
  const prisma = deps.prisma || defaultPrisma;
  const getPipeline = deps.getPipeline || (() => pipeline);
  const generateChatAnswer =
    deps.generateChatAnswer ||
    (async (messages) => {
      const chat = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: 'qwen/qwen3.8-27b',
      });
      const response = await chat.invoke(messages);
      return response.content;
    });

  const getSessions = async (req, res) => {
    try {
      const sessions = await prisma.chat_sessions.findMany({
        where: { user_id: req.user.id },
        orderBy: { updated_at: 'desc' },
      });
      res.json(sessions);
    } catch (err) {
      console.error('getSessions error:', err.message);
      res.status(500).json({ detail: 'Failed to retrieve chat sessions' });
    }
  };

  const createSession = async (req, res) => {
    try {
      const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : 'New Chat';
      const session = await prisma.chat_sessions.create({
        data: { user_id: req.user.id, title },
      });
      await prisma.activity_logs.create({
        data: {
          user_id: req.user.id,
          action: 'chat_started',
          target_type: 'chat_session',
          target_id: session.id,
          details: `Started chat '${title}'`,
        },
      });
      res.status(201).json(session);
    } catch (err) {
      console.error('createSession error:', err.message);
      res.status(500).json({ detail: 'Failed to create chat session' });
    }
  };

  const updateSession = async (req, res) => {
    try {
      const sessionId = parsePositiveInt(req.params.session_id);
      if (!sessionId) {
        return res.status(400).json({ detail: 'Invalid session_id' });
      }

      const { title, is_pinned } = req.body || {};
      const data = { updated_at: new Date() };
      if (title !== undefined) data.title = title;
      if (is_pinned !== undefined) data.is_pinned = is_pinned;

      const updatedResult = await prisma.chat_sessions.updateMany({
        where: {
          id: sessionId,
          user_id: req.user.id,
        },
        data,
      });

      if (updatedResult.count === 0) {
        return res.status(404).json({ detail: 'Chat session not found' });
      }

      const session = await prisma.chat_sessions.findFirst({
        where: {
          id: sessionId,
          user_id: req.user.id,
        },
      });

      if (!session) {
        return res.status(404).json({ detail: 'Chat session not found' });
      }

      res.json(session);
    } catch (err) {
      console.error('updateSession error:', err.message);
      res.status(500).json({ detail: 'Failed to update chat session' });
    }
  };

  const deleteSession = async (req, res) => {
    try {
      const sessionId = parsePositiveInt(req.params.session_id);
      if (!sessionId) {
        return res.status(400).json({ detail: 'Invalid session_id' });
      }

      const deleted = await prisma.$transaction(async (tx) => {
        const owned = await tx.chat_sessions.findFirst({
          where: {
            id: sessionId,
            user_id: req.user.id,
          },
        });

        if (!owned) {
          return false;
        }

        // Schema uses onDelete: NoAction on chat_messages -> chat_sessions, so remove child messages first
        await tx.chat_messages.deleteMany({
          where: { session_id: sessionId },
        });

        const delResult = await tx.chat_sessions.deleteMany({
          where: {
            id: sessionId,
            user_id: req.user.id,
          },
        });

        return delResult.count > 0;
      });

      if (!deleted) {
        return res.status(404).json({ detail: 'Chat session not found' });
      }

      res.json({ status: 'ok' });
    } catch (err) {
      console.error('deleteSession error:', err.message);
      res.status(500).json({ detail: 'Failed to delete chat session' });
    }
  };

  const getSessionMessages = async (req, res) => {
    try {
      const sessionId = parsePositiveInt(req.params.session_id);
      if (!sessionId) {
        return res.status(400).json({ detail: 'Invalid session_id' });
      }

      const session = await prisma.chat_sessions.findFirst({
        where: {
          id: sessionId,
          user_id: req.user.id,
        },
      });

      if (!session) {
        return res.status(404).json({ detail: 'Chat session not found' });
      }

      const messages = await prisma.chat_messages.findMany({
        where: { session_id: session.id },
        orderBy: { created_at: 'asc' },
      });

      res.json(messages);
    } catch (err) {
      console.error('getSessionMessages error:', err.message);
      res.status(500).json({ detail: 'Failed to retrieve chat messages' });
    }
  };

  const semanticSearch = async (req, res) => {
    try {
      const startTime = Date.now();
      const { query, collection_id, session_id } = req.body || {};

      if (typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ detail: 'Query is required' });
      }

      const activePipeline = getPipeline();
      if (!activePipeline) {
        return res.status(500).json({ detail: 'AI Model not loaded' });
      }

      let parsedCollectionId = null;
      if (collection_id !== undefined && collection_id !== null && collection_id !== '') {
        parsedCollectionId = parsePositiveInt(collection_id);
        if (!parsedCollectionId) {
          return res.status(400).json({ detail: 'Invalid collection_id' });
        }
      }

      // Verify ownership of supplied session_id BEFORE any message write, history read, or timestamp update
      let activeSessionId;
      if (session_id !== undefined && session_id !== null && session_id !== '') {
        const parsedSessionId = parsePositiveInt(session_id);
        if (!parsedSessionId) {
          return res.status(400).json({ detail: 'Invalid session_id' });
        }

        const existingSession = await prisma.chat_sessions.findFirst({
          where: {
            id: parsedSessionId,
            user_id: req.user.id,
          },
        });

        if (!existingSession) {
          return res.status(404).json({ detail: 'Chat session not found' });
        }

        activeSessionId = existingSession.id;
      } else {
        const newSess = await prisma.chat_sessions.create({
          data: { user_id: req.user.id, title: query.substring(0, 30) + '...' },
        });
        activeSessionId = newSess.id;
      }

      await prisma.chat_messages.create({
        data: { session_id: activeSessionId, role: 'user', content: query, citations: [] },
      });

      const output = await activePipeline(query, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      const embeddingStr = `[${embedding.join(',')}]`;

      const orgs = await prisma.organization_users.findMany({
        where: { user_id: req.user.id },
        select: { organization_id: true },
      });
      const orgIds = orgs.map((o) => o.organization_id);

      let whereClause = `w.organization_id IN (${orgIds.join(',') || '0'}) AND d.status = 'completed'`;
      if (parsedCollectionId) {
        whereClause += ` AND d.collection_id = ${parsedCollectionId}`;
      }

      const results = await prisma.$queryRawUnsafe(
        `
        SELECT ch.id as chunk_id, d.id as document_id, d.title as document_title, ch.page_number, ch.text_content, 
               1 - (ch.embedding <=> $1::vector) as similarity
        FROM document_chunks ch
        JOIN documents d ON ch.document_id = d.id
        JOIN collections c ON d.collection_id = c.id
        JOIN departments dept ON c.department_id = dept.id
        JOIN workspaces w ON dept.workspace_id = w.id
        WHERE ${whereClause}
        ORDER BY ch.embedding <=> $1::vector
        LIMIT 5
      `,
        embeddingStr
      );

      const searchResults = results.map((r) => ({
        chunk_id: r.chunk_id,
        document_id: r.document_id,
        document_title: r.document_title,
        page_number: r.page_number ?? null,
        text_content: r.text_content,
        similarity: Math.max(0, parseFloat(r.similarity) || 0),
      }));

      let aiAnswer = "I couldn't find any relevant information in your accessible documents for that query.";

      if ((process.env.GROQ_API_KEY || deps.generateChatAnswer) && searchResults.length > 0) {
        const history = await prisma.chat_messages.findMany({
          where: { session_id: activeSessionId },
          orderBy: { created_at: 'desc' },
          take: 10,
        });
        history.reverse();

        const messages = [
          new SystemMessage(
            "You are IntelliChat, an enterprise AI assistant. Answer the user's query based ONLY on the provided document excerpts. Be conversational but concise. If the answer is not in the excerpts, say you don't know based on the provided documents."
          ),
        ];

        for (let i = 0; i < history.length - 1; i++) {
          const msg = history[i];
          if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
          else messages.push(new AIMessage(msg.content));
        }

        const contextText = searchResults
          .map((r) => {
            const pageLabel = r.page_number ? ` (Page ${r.page_number})` : '';
            return `Document: ${r.document_title}${pageLabel}\nExcerpt: ${r.text_content}`;
          })
          .join('\n\n');
        messages.push(new HumanMessage(`Context from documents:\n${contextText}\n\nUser Query: ${query}`));

        try {
          aiAnswer = await generateChatAnswer(messages);
        } catch (err) {
          console.error('Groq error:', err.message);
          aiAnswer = 'Sorry, I encountered an error while generating a conversational response.';
        }
      } else if (searchResults.length > 0) {
        aiAnswer = 'Here are the most relevant excerpts I found from your documents:';
      }

      await prisma.chat_messages.create({
        data: {
          session_id: activeSessionId,
          role: 'ai',
          content: aiAnswer,
          citations: searchResults,
        },
      });

      await prisma.chat_sessions.updateMany({
        where: { id: activeSessionId, user_id: req.user.id },
        data: { updated_at: new Date() },
      });

      const confidenceScore = searchResults.length > 0 ? Math.max(...searchResults.map((r) => r.similarity)) * 100 : 0;

      res.json({
        answer: aiAnswer,
        citations: searchResults,
        session_id: activeSessionId,
        processing_time_ms: Date.now() - startTime,
        confidence_score: parseFloat(confidenceScore.toFixed(1)),
        suggested_prompts: [
          `Tell me more about ${query}`,
          'Can you summarize this?',
          'What are the main exceptions to this?',
        ],
      });
    } catch (err) {
      console.error('semanticSearch error:', err.message);
      res.status(500).json({ detail: 'Failed to process chat query' });
    }
  };

  return {
    getSessions,
    createSession,
    updateSession,
    deleteSession,
    getSessionMessages,
    semanticSearch,
  };
}

const defaultHandlers = createChatController();

module.exports = {
  ...defaultHandlers,
  createChatController,
  parsePositiveInt,
};
