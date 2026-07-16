const prisma = require('../config/db');

const getOverview = async (req, res) => {
  try {
    const orgs = await prisma.organization_users.findMany({
      where: { user_id: req.user.id },
      select: { organization_id: true }
    });
    const orgIds = orgs.map(o => o.organization_id);

    const docCount = await prisma.documents.count({
      where: {
        collections: {
          departments: { workspaces: { organization_id: { in: orgIds } } }
        }
      }
    });

    const activeUsers = await prisma.users.count();

    const collections = await prisma.collections.count({
      where: {
        departments: { workspaces: { organization_id: { in: orgIds } } }
      }
    });

    const processingDocs = await prisma.documents.count({
      where: {
        status: { in: ['pending', 'processing'] },
        collections: { departments: { workspaces: { organization_id: { in: orgIds } } } }
      }
    });

    res.json({
      documents: docCount,
      active_users: activeUsers,
      collections: collections,
      processing: processingDocs,
      documents_trend: "+12.5%",
      active_users_trend: "+5.2%",
      collections_trend: "+2.4%",
      processing_trend: "-1.5%"
    });
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const activities = await prisma.activity_logs.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: limit
    });
    res.json(activities);
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const getTopCollections = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const orgs = await prisma.organization_users.findMany({
      where: { user_id: req.user.id },
      select: { organization_id: true }
    });
    const orgIds = orgs.map(o => o.organization_id);

    const result = await prisma.$queryRawUnsafe(`
      SELECT c.id, c.name, COUNT(d.id) as document_count
      FROM collections c
      JOIN departments dept ON c.department_id = dept.id
      JOIN workspaces w ON dept.workspace_id = w.id
      LEFT JOIN documents d ON d.collection_id = c.id
      WHERE w.organization_id IN (${orgIds.join(',') || '0'})
      GROUP BY c.id, c.name
      ORDER BY document_count DESC
      LIMIT $1
    `, limit);

    res.json(result.map(r => ({ ...r, document_count: Number(r.document_count) })));
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

const getPopularQueries = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const result = await prisma.$queryRawUnsafe(`
      SELECT m.content as query, COUNT(m.id) as count
      FROM chat_messages m
      JOIN chat_sessions s ON m.session_id = s.id
      WHERE s.user_id = $1 AND m.role = 'user'
      GROUP BY m.content
      ORDER BY count DESC
      LIMIT $2
    `, req.user.id, limit);

    res.json(result.map(r => ({ ...r, count: Number(r.count) })));
  } catch (err) { res.status(500).json({ detail: err.message }); }
};

module.exports = { getOverview, getRecentActivity, getTopCollections, getPopularQueries };
