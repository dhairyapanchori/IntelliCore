const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./config/db');
const IORedis = require('ioredis');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/organizations');
const workspaceRoutes = require('./routes/workspaces');
const deptRoutes = require('./routes/departments');
const collectionRoutes = require('./routes/collections');
const documentRoutes = require('./routes/documents');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IntelliCore Express API is running' });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', orgRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/departments', deptRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/settings', settingsRoutes);

const validateEnvironment = () => {
  const requiredVars = ['DATABASE_URL'];
  const optionalVars = {
    PORT: 8001,
    JWT_SECRET: 'default_development_secret_do_not_use_in_prod',
    REDIS_URL: 'redis://127.0.0.1:6379'
  };
  
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ [Fatal] Missing required environment variables: ${missing.join(', ')}`);
    console.error(`Please check your .env file or reference .env.example / setup.md.`);
    process.exit(1);
  }

  for (const [key, fallback] of Object.entries(optionalVars)) {
    if (!process.env[key]) {
      if (key === 'JWT_SECRET' && process.env.NODE_ENV === 'production') {
        console.error(`❌ [Fatal] JWT_SECRET must be explicitly set in production environments!`);
        process.exit(1);
      }
      process.env[key] = String(fallback);
    }
  }
};

const startServer = async () => {
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│      🤖 IntelliCore Enterprise AI Server     │');
  console.log('└──────────────────────────────────────────────┘');
  
  validateEnvironment();

  const PORT = parseInt(process.env.PORT || 8001, 10);

  // Probe PostgreSQL connection via Prisma
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ [PostgreSQL] Connected successfully to database.`);
  } catch (dbError) {
    console.error(`❌ [PostgreSQL] Database connection failed at ${process.env.DATABASE_URL}.`);
    console.error(`   Error details: ${dbError.message}`);
    console.error(`   Ensure PostgreSQL is running and credentials in .env are correct.`);
    process.exit(1);
  }

  // Probe Redis connection for background processing
  try {
    const testRedis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 2000
    });
    testRedis.on('error', () => {}); // Catch emitter errors
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        testRedis.disconnect();
        reject(new Error("Connection timed out"));
      }, 2500);
      testRedis.on('connect', () => {
        clearTimeout(timeout);
        testRedis.quit();
        resolve();
      });
      testRedis.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    console.log(`✅ [Redis/BullMQ] Connected successfully (${process.env.REDIS_URL}). Worker queue enabled.`);
  } catch (redisError) {
    console.warn(`⚠️ [Redis/BullMQ] Redis server unreachable at ${process.env.REDIS_URL} (${redisError.message}).`);
    console.warn(`   Express API starting in degraded mode (background document worker jobs disabled).`);
  }

  // Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 [API Ready] Express server listening on http://localhost:${PORT}/api/v1\n`);
  });
};

startServer();
