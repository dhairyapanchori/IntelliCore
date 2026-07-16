const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/auth');

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IntelliCore Express API is running' });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
