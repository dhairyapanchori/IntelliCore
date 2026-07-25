const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const signup = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ detail: "The user with this email already exists in the system." });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        email,
        hashed_password,
        full_name,
        is_active: true,
        is_superuser: false,
      }
    });

    // Auto-provision hierarchy
    const org = await prisma.organizations.create({
      data: { name: "My Organization" }
    });

    await prisma.organization_users.create({
      data: {
        organization_id: org.id,
        user_id: user.id,
        role: "owner"
      }
    });

    const workspace = await prisma.workspaces.create({
      data: {
        name: "Global Workspace",
        description: "Default workspace for all your documents.",
        organization_id: org.id,
        owner_id: user.id,
        type: "Private"
      }
    });

    const department = await prisma.departments.create({
      data: {
        name: "General",
        description: "General department.",
        workspace_id: workspace.id,
        head_id: user.id
      }
    });

    // Remove password from response
    const { hashed_password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ detail: error.message });
  }
};

const login = async (req, res) => {
  try {
    // URL-encoded form data will be parsed by express.urlencoded()
    const email = req.body.username || req.body.email;
    const password = req.body.password;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ detail: "Incorrect email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.hashed_password);
    if (!validPassword) {
      return res.status(400).json({ detail: "Incorrect email or password" });
    }

    if (!user.is_active) {
      return res.status(400).json({ detail: "Inactive user" });
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      access_token: token,
      token_type: "bearer"
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ detail: error.message });
  }
};

const getMe = async (req, res) => {
  const { hashed_password: _, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
};

module.exports = { signup, login, getMe };
