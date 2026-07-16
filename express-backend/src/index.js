const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

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

// Start server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
