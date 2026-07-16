const prisma = require('../config/db');

const getOrganizations = async (req, res) => {
  try {
    const orgs = await prisma.organizations.findMany({
      where: {
        organization_users: {
          some: {
            user_id: req.user.id
          }
        }
      }
    });
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

const createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    const org = await prisma.organizations.create({
      data: { name }
    });

    await prisma.organization_users.create({
      data: {
        organization_id: org.id,
        user_id: req.user.id,
        role: "owner"
      }
    });

    res.status(201).json(org);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

const getOrganization = async (req, res) => {
  try {
    const orgId = parseInt(req.params.org_id);
    const access = await prisma.organization_users.findFirst({
      where: {
        organization_id: orgId,
        user_id: req.user.id
      }
    });

    if (!access) {
      return res.status(403).json({ detail: "Not enough permissions" });
    }

    const org = await prisma.organizations.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      return res.status(404).json({ detail: "Organization not found" });
    }

    res.json(org);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

const getOrganizationUsers = async (req, res) => {
  try {
    const orgId = parseInt(req.params.org_id);
    const access = await prisma.organization_users.findFirst({
      where: {
        organization_id: orgId,
        user_id: req.user.id
      }
    });

    if (!access) {
      return res.status(403).json({ detail: "Not enough permissions" });
    }

    const orgUsers = await prisma.organization_users.findMany({
      where: { organization_id: orgId },
      include: { users: true }
    });

    const result = orgUsers.map(ou => ({
      id: ou.users.id,
      email: ou.users.email,
      full_name: ou.users.full_name,
      is_active: ou.users.is_active,
      role: ou.role
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
};

module.exports = { getOrganizations, createOrganization, getOrganization, getOrganizationUsers };
