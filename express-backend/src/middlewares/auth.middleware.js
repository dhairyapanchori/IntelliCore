const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: "Not authenticated: JWT access token missing in header" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({ where: { id: decoded.sub } });
    
    if (!user) {
      return res.status(401).json({ detail: "User not found in PostgreSQL database" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ detail: `Could not validate credentials: ${error.message}` });
  }
};

module.exports = { authenticateToken };
