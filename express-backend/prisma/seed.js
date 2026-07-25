const bcrypt = require('bcrypt');
const prisma = require('../src/config/db');

async function main() {
  console.log('🌱 Starting IntelliCore database seeding...');

  // 1. Ensure admin user exists
  const adminEmail = 'admin@intellicore.ai';
  let user = await prisma.users.findUnique({ where: { email: adminEmail } });

  if (!user) {
    console.log(`Creating default admin account (${adminEmail})...`);
    const hashed_password = await bcrypt.hash('admin123', 10);
    user = await prisma.users.create({
      data: {
        email: adminEmail,
        hashed_password,
        full_name: 'Admin User',
        is_active: true,
        is_superuser: true,
      }
    });
  } else {
    console.log(`Admin account (${adminEmail}) already exists.`);
  }

  // 2. Ensure user preferences exist
  let prefs = await prisma.user_preferences.findUnique({ where: { user_id: user.id } });
  if (!prefs) {
    await prisma.user_preferences.create({
      data: {
        user_id: user.id,
        language: 'English',
        theme: 'dark',
        default_ai_model: 'gpt-4o',
        response_length: 'balanced',
        citation_toggle: true,
        semantic_search: true,
      }
    });
  }

  // 3. Ensure organization exists
  let org = await prisma.organizations.findFirst();
  if (!org) {
    console.log('Creating default organization ("IntelliCore Enterprise")...');
    org = await prisma.organizations.create({
      data: {
        name: 'IntelliCore Enterprise',
        description: 'Default enterprise organization for IntelliCore AI Platform.',
      }
    });
  }

  // Ensure user is linked to organization
  let orgUser = await prisma.organization_users.findFirst({
    where: { organization_id: org.id, user_id: user.id }
  });
  if (!orgUser) {
    await prisma.organization_users.create({
      data: {
        organization_id: org.id,
        user_id: user.id,
        role: 'owner'
      }
    });
  }

  // 4. Ensure workspace exists
  let workspace = await prisma.workspaces.findFirst({
    where: { organization_id: org.id }
  });
  if (!workspace) {
    console.log('Creating default workspace ("Global Workspace")...');
    workspace = await prisma.workspaces.create({
      data: {
        name: 'Global Workspace',
        description: 'Centralized workspace for departmental data sources and AI chat.',
        organization_id: org.id,
        owner_id: user.id,
        type: 'Private',
        status: 'Active'
      }
    });
  }

  // 5. Ensure department exists
  let department = await prisma.departments.findFirst({
    where: { workspace_id: workspace.id }
  });
  if (!department) {
    console.log('Creating default department ("General")...');
    department = await prisma.departments.create({
      data: {
        name: 'General',
        description: 'Primary department for general document collections.',
        workspace_id: workspace.id,
        head_id: user.id,
        status: 'Active'
      }
    });
  }

  // 6. Ensure default collection exists
  let collection = await prisma.collections.findFirst({
    where: { department_id: department.id }
  });
  if (!collection) {
    console.log('Creating default collection ("Welcome Documents")...');
    collection = await prisma.collections.create({
      data: {
        name: 'Welcome Documents',
        description: 'Introductory collection ready for file uploads, semantic RAG search, and AI Chat.',
        department_id: department.id
      }
    });
  }

  console.log('✨ [Success] Database seeding complete! You are ready to start IntelliCore.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
