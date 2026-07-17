const prisma = require('../config/db');

const checkOrgAccess = async (userId, orgId) => {
  const access = await prisma.organization_users.findFirst({
    where: { organization_id: orgId, user_id: userId }
  });
  if (!access) throw new Error("Not enough permissions for this organization");
  return access;
};

const getWorkspaces = async (req, res) => {
  try {
    const orgId = parseInt(req.query.organization_id);
    if (!orgId) return res.status(400).json({ detail: "organization_id is required" });

    await checkOrgAccess(req.user.id, orgId);

    const workspaces = await prisma.workspaces.findMany({
      where: { organization_id: orgId },
      include: {
        // users: true, // owner
        departments: {
          include: {
            collections: {
              include: {
                documents: true
              }
            }
          }
        }
      }
    });

    const orgMembersCount = await prisma.organization_users.count({
      where: { organization_id: orgId }
    });

    const result = workspaces.map(ws => {
      let colCount = 0;
      let docCount = 0;
      let storageUsed = 0;

      ws.departments.forEach(dept => {
        colCount += dept.collections.length;
        dept.collections.forEach(col => {
          docCount += col.documents.length;
          storageUsed += col.documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
        });
      });

      return {
        id: ws.id,
        name: ws.name,
        description: ws.description,
        organization_id: ws.organization_id,
        type: ws.type || 'Private',
        status: ws.status || 'Active',
        owner_id: ws.owner_id,
        owner_name: null,
        members_count: orgMembersCount,
        collections_count: colCount,
        documents_count: docCount,
        storage_used: storageUsed,
        created_at: ws.created_at,
        updated_at: ws.updated_at
      };
    });

    res.json(result);
  } catch (error) {
    res.status(403).json({ detail: error.message });
  }
};

const createWorkspace = async (req, res) => {
  try {
    const { name, description, organization_id } = req.body;
    await checkOrgAccess(req.user.id, organization_id);

    const workspace = await prisma.workspaces.create({
      data: {
        name,
        description,
        organization_id,
        owner_id: req.user.id,
        type: "Private",
        status: "Active"
      }
    });

    const orgMembersCount = await prisma.organization_users.count({
      where: { organization_id }
    });

    res.status(201).json({
      ...workspace,
      owner_name: req.user.full_name,
      members_count: orgMembersCount,
      collections_count: 0,
      documents_count: 0,
      storage_used: 0
    });
  } catch (error) {
    res.status(403).json({ detail: error.message });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const wsId = parseInt(req.params.workspace_id);
    const workspace = await prisma.workspaces.findUnique({ where: { id: wsId } });
    if (!workspace) return res.status(404).json({ detail: "Workspace not found" });

    await checkOrgAccess(req.user.id, workspace.organization_id);

    await prisma.workspaces.delete({ where: { id: wsId } });
    res.status(204).send();
  } catch (error) {
    res.status(403).json({ detail: error.message });
  }
};

module.exports = { getWorkspaces, createWorkspace, deleteWorkspace };
