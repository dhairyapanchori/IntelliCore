import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface SearchResult {
  chunk_id: number;
  document_id: number;
  document_title: string;
  text_content: string;
  similarity: number;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: SearchResult[];
}

const CitationsBlock = ({ citations }: { citations: SearchResult[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!citations || citations.length === 0) return null;
  
  const groupedCitations = citations.reduce((acc, citation) => {
    if (!acc[citation.document_title]) {
      acc[citation.document_title] = [];
    }
    acc[citation.document_title].push(citation);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="w-full mt-3">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-accent/50 hover:bg-accent px-4 py-2 rounded-full border border-border/50 shadow-sm"
      >
        <Search size={14} />
        <span>{isExpanded ? 'Hide sources' : `View ${citations.length} sources`}</span>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {Object.entries(groupedCitations).map(([title, chunks], idx) => (
              <div key={idx} className="bg-card/30 border border-border/60 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-3.5 bg-muted/20 border-b border-border/40">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                    <Search size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {chunks.length} {chunks.length === 1 ? 'excerpt' : 'excerpts'} • {Math.max(...chunks.map(c => Math.round(c.similarity * 100)))}% match
                    </p>
                  </div>
                </div>
                
                <div className="p-4 max-h-72 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {chunks.map((chunk, cIdx) => (
                    <div key={cIdx} className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-p:text-muted-foreground/90">
                      <ReactMarkdown>
                        {chunk.text_content.replace(/\n{3,}/g, '\n\n')}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('intellichat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore JSON parse error
      }
    }
    return [
      {
        id: 'welcome',
        role: 'ai',
        content: 'Hello! I am IntelliChat. Ask me any question, and I will search through all your accessible enterprise documents to find the answer.',
      }
    ];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('intellichat_history', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/query', {
        query: userMessage.content,
      });

      const data = response.data;
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: data.answer,
        citations: data.citations,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Search failed:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error while searching your documents."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
              }`}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-card border border-border text-card-foreground rounded-tl-sm'
                }`}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      {message.content}
                    </p>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-accent prose-pre:border prose-pre:border-border">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                
                {message.citations && message.citations.length > 0 && (
                  <CitationsBlock citations={message.citations} />
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 flex-row"
            >
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Searching enterprise knowledge base...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="shrink-0 p-4 bg-background border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your documents..."
              disabled={isLoading}
              className="w-full bg-card border border-border rounded-full pl-6 pr-14 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm disabled:opacity-50 transition-shadow hover:shadow-md"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors flex items-center justify-center shadow-sm"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground font-medium">
            IntelliChat AI securely searches across your accessible workspaces and departments.
          </div>
        </div>
      </div>
    </div>
  );
}
