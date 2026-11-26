const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatController } = require('../src/controllers/chat.controller');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createStatefulMockDb() {
  const initialUpdatedAtB = new Date('2026-01-01T10:00:00Z');

  const state = {
    nextSessionId: 300,
    nextMessageId: 1000,
    sessions: [
      { id: 101, user_id: 1, title: 'User A Session', is_pinned: false, created_at: new Date('2026-01-01T09:00:00Z'), updated_at: new Date('2026-01-01T09:00:00Z') },
      { id: 202, user_id: 2, title: 'User B Private Session', is_pinned: true, created_at: new Date('2026-01-01T10:00:00Z'), updated_at: initialUpdatedAtB },
    ],
    messages: [
      { id: 1, session_id: 101, role: 'user', content: 'User A hello', citations: [], created_at: new Date('2026-01-01T09:01:00Z') },
      { id: 2, session_id: 101, role: 'ai', content: 'Hello User A', citations: [], created_at: new Date('2026-01-01T09:02:00Z') },
      { id: 3, session_id: 202, role: 'user', content: 'Top secret User B discussion', citations: [], created_at: new Date('2026-01-01T10:01:00Z') },
      { id: 4, session_id: 202, role: 'ai', content: 'Confidential reply for User B', citations: [], created_at: new Date('2026-01-01T10:02:00Z') },
    ],
    activityLogs: [],
    historyReadSessionIds: [],
  };

  const makeTx = () => ({
    chat_sessions: {
      findMany: async ({ where, orderBy } = {}) => {
        let rows = state.sessions.filter((s) => (where?.user_id !== undefined ? s.user_id === where.user_id : true));
        if (orderBy?.updated_at === 'desc') {
          rows = [...rows].sort((a, b) => b.updated_at - a.updated_at);
        }
        return rows.map((r) => ({ ...r }));
      },
      findFirst: async ({ where } = {}) => {
        const match = state.sessions.find((s) => {
          if (where?.id !== undefined && s.id !== where.id) return false;
          if (where?.user_id !== undefined && s.user_id !== where.user_id) return false;
          return true;
        });
        return match ? { ...match } : null;
      },
      create: async ({ data }) => {
        const row = {
          id: state.nextSessionId++,
          user_id: data.user_id,
          title: data.title,
          is_pinned: data.is_pinned ?? false,
          created_at: new Date(),
          updated_at: new Date(),
        };
        state.sessions.push(row);
        return { ...row };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const s of state.sessions) {
          const idMatch = where?.id === undefined || s.id === where.id;
          const userMatch = where?.user_id === undefined || s.user_id === where.user_id;
          if (idMatch && userMatch) {
            Object.assign(s, data);
            count++;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }) => {
        const before = state.sessions.length;
        state.sessions = state.sessions.filter((s) => {
          const idMatch = where?.id === undefined || s.id === where.id;
          const userMatch = where?.user_id === undefined || s.user_id === where.user_id;
          return !(idMatch && userMatch);
        });
        return { count: before - state.sessions.length };
      },
    },
    chat_messages: {
      findMany: async ({ where, orderBy } = {}) => {
        if (where?.session_id !== undefined) {
          state.historyReadSessionIds.push(where.session_id);
        }
        let rows = state.messages.filter((m) => (where?.session_id !== undefined ? m.session_id === where.session_id : true));
        if (orderBy?.created_at === 'asc') {
          rows = [...rows].sort((a, b) => a.created_at - b.created_at);
        } else if (orderBy?.created_at === 'desc') {
          rows = [...rows].sort((a, b) => b.created_at - a.created_at);
        }
        return rows.map((r) => ({ ...r }));
      },
      create: async ({ data }) => {
        const row = {
          id: state.nextMessageId++,
          session_id: data.session_id,
          role: data.role,
          content: data.content,
          citations: data.citations || [],
          created_at: new Date(),
        };
        state.messages.push(row);
        return { ...row };
      },
      deleteMany: async ({ where }) => {
        const before = state.messages.length;
        state.messages = state.messages.filter((m) => !(where?.session_id !== undefined && m.session_id === where.session_id));
        return { count: before - state.messages.length };
      },
    },
    organization_users: {
      findMany: async () => [{ organization_id: 1 }],
    },
    activity_logs: {
      create: async ({ data }) => {
        state.activityLogs.push(data);
        return data;
      },
    },
    $queryRawUnsafe: async () => [
      {
        chunk_id: 10,
        document_id: 5,
        document_title: 'Handbook.pdf',
        page_number: 2,
        text_content: 'Employees receive 18 days of annual leave.',
        similarity: 0.91,
      },
    ],
  });

  const db = makeTx();
  db.$transaction = async (fn) => fn(db);
  return { db, state, initialUpdatedAtB };
}

function buildTestController() {
  const { db, state, initialUpdatedAtB } = createStatefulMockDb();
  const mockPipeline = async () => ({ data: new Float32Array(384).fill(0.05) });
  const controller = createChatController({
    prisma: db,
    getPipeline: () => mockPipeline,
    generateChatAnswer: async () => 'Grounded AI response.',
  });
  return { controller, state, initialUpdatedAtB };
}

test('Chat Ownership: getSessions only returns sessions owned by authenticated user', async () => {
  const { controller } = buildTestController();
  const resA = createMockRes();
  await controller.getSessions({ user: { id: 1 } }, resA);
  assert.equal(resA.statusCode, 200);
  assert.deepEqual(resA.body.map((s) => s.id), [101]);

  const resB = createMockRes();
  await controller.getSessions({ user: { id: 2 } }, resB);
  assert.equal(resB.statusCode, 200);
  assert.deepEqual(resB.body.map((s) => s.id), [202]);
});

test('Chat Ownership: getSessionMessages allows owner and returns 404 for other user', async () => {
  const { controller } = buildTestController();

  // User A reads own session 101 -> allowed
  const resOwn = createMockRes();
  await controller.getSessionMessages({ user: { id: 1 }, params: { session_id: '101' } }, resOwn);
  assert.equal(resOwn.statusCode, 200);
  assert.equal(resOwn.body.length, 2);
  assert.equal(resOwn.body[0].content, 'User A hello');

  // User A reads User B session 202 -> 404
  const resOther = createMockRes();
  await controller.getSessionMessages({ user: { id: 1 }, params: { session_id: '202' } }, resOther);
  assert.equal(resOther.statusCode, 404);

  // User B reads own session 202 -> allowed
  const resBOwn = createMockRes();
  await controller.getSessionMessages({ user: { id: 2 }, params: { session_id: '202' } }, resBOwn);
  assert.equal(resBOwn.statusCode, 200);
  assert.equal(resBOwn.body[0].content, 'Top secret User B discussion');

  // User B reads User A session 101 -> 404
  const resBOther = createMockRes();
  await controller.getSessionMessages({ user: { id: 2 }, params: { session_id: '101' } }, resBOther);
  assert.equal(resBOther.statusCode, 404);
});

test('Chat Ownership: updateSession allows owner and returns 404 without modifying other user session', async () => {
  const { controller, state } = buildTestController();

  // User A updates own session 101 -> allowed
  const resOwn = createMockRes();
  await controller.updateSession(
    { user: { id: 1 }, params: { session_id: '101' }, body: { title: 'Renamed A', is_pinned: true } },
    resOwn
  );
  assert.equal(resOwn.statusCode, 200);
  assert.equal(resOwn.body.title, 'Renamed A');
  assert.equal(resOwn.body.is_pinned, true);

  // User A attempts to update User B session 202 -> 404 and unchanged
  const resOther = createMockRes();
  await controller.updateSession(
    { user: { id: 1 }, params: { session_id: '202' }, body: { title: 'Hacked Title' } },
    resOther
  );
  assert.equal(resOther.statusCode, 404);
  const session202 = state.sessions.find((s) => s.id === 202);
  assert.equal(session202.title, 'User B Private Session');
});

test('Chat Ownership: deleteSession deletes own session + messages atomically and returns 404 for other user', async () => {
  const { controller, state } = buildTestController();

  // User A attempts to delete User B session 202 -> 404, session & messages remain intact
  const resOther = createMockRes();
  await controller.deleteSession({ user: { id: 1 }, params: { session_id: '202' } }, resOther);
  assert.equal(resOther.statusCode, 404);
  assert.ok(state.sessions.some((s) => s.id === 202));
  assert.equal(state.messages.filter((m) => m.session_id === 202).length, 2);

  // User A deletes own session 101 -> 200, session & child messages removed cleanly
  const resOwn = createMockRes();
  await controller.deleteSession({ user: { id: 1 }, params: { session_id: '101' } }, resOwn);
  assert.equal(resOwn.statusCode, 200);
  assert.equal(state.sessions.some((s) => s.id === 101), false);
  assert.equal(state.messages.filter((m) => m.session_id === 101).length, 0);
});

test('Chat Security: semanticSearch rejects cross-user session_id (202) with 404 and zero side effects', async () => {
  const { controller, state, initialUpdatedAtB } = buildTestController();
  const initialMsgCount202 = state.messages.filter((m) => m.session_id === 202).length;
  const initialSessionCount = state.sessions.length;

  // User A sends semanticSearch attack targeting User B's session 202
  const resAttack = createMockRes();
  await controller.semanticSearch(
    {
      user: { id: 1 },
      body: { query: 'Tell me about the previous discussion', session_id: 202 },
    },
    resAttack
  );

  assert.equal(resAttack.statusCode, 404);
  assert.equal(state.sessions.length, initialSessionCount, 'Must not silently create a replacement session');
  assert.equal(
    state.messages.filter((m) => m.session_id === 202).length,
    initialMsgCount202,
    'Must not insert user or AI messages into session 202'
  );
  assert.equal(
    state.historyReadSessionIds.includes(202),
    false,
    'Must not read conversation history from session 202'
  );
  const session202 = state.sessions.find((s) => s.id === 202);
  assert.equal(session202.updated_at.getTime(), initialUpdatedAtB.getTime(), 'Must not update session 202 timestamp');

  // Legitimate query using User A's own session 101 -> allowed
  const resOwn = createMockRes();
  await controller.semanticSearch(
    {
      user: { id: 1 },
      body: { query: 'How many leave days do employees get?', session_id: 101 },
    },
    resOwn
  );
  assert.equal(resOwn.statusCode, 200);
  assert.equal(resOwn.body.session_id, 101);
  assert.equal(state.messages.filter((m) => m.session_id === 101).length, 4);

  // Legitimate query without session_id -> creates new session owned by User A (id: 1)
  const resNew = createMockRes();
  await controller.semanticSearch(
    {
      user: { id: 1 },
      body: { query: 'New topic query' },
    },
    resNew
  );
  assert.equal(resNew.statusCode, 200);
  const created = state.sessions.find((s) => s.id === resNew.body.session_id);
  assert.ok(created);
  assert.equal(created.user_id, 1);
});

test('Chat Validation: malformed session_id returns 400 across all endpoints and client user_id is ignored', async () => {
  const { controller } = buildTestController();

  for (const badId of ['abc', '0', '-5', '12abc', '1.5']) {
    const r1 = createMockRes();
    await controller.getSessionMessages({ user: { id: 1 }, params: { session_id: badId } }, r1);
    assert.equal(r1.statusCode, 400);

    const r2 = createMockRes();
    await controller.updateSession({ user: { id: 1 }, params: { session_id: badId }, body: { title: 'x' } }, r2);
    assert.equal(r2.statusCode, 400);

    const r3 = createMockRes();
    await controller.deleteSession({ user: { id: 1 }, params: { session_id: badId } }, r3);
    assert.equal(r3.statusCode, 400);

    const r4 = createMockRes();
    await controller.semanticSearch({ user: { id: 1 }, body: { query: 'hello', session_id: badId } }, r4);
    assert.equal(r4.statusCode, 400);
  }

  // Client-supplied user_id in createSession body must be ignored in favor of req.user.id
  const resCreate = createMockRes();
  await controller.createSession({ user: { id: 1 }, body: { title: 'Safe Session', user_id: 2 } }, resCreate);
  assert.equal(resCreate.statusCode, 201);
  assert.equal(resCreate.body.user_id, 1);
});
