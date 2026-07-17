const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { authenticateToken } = require('../middlewares/auth.middleware');
const bcrypt = require('bcryptjs');

router.use(authenticateToken);

// GET Settings & Profile
router.get('/', async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        is_active: true,
        created_at: true,
        user_preferences: true
      }
    });

    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }

    // Ensure preferences exist
    let prefs = user.user_preferences;
    if (!prefs) {
      prefs = await prisma.user_preferences.create({
        data: {
          user_id: user.id
        }
      });
    }

    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name }, preferences: prefs });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PUT update preferences
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate we're not inserting unknown fields
    const updatedPrefs = await prisma.user_preferences.update({
      where: { user_id: req.user.id },
      data: updates
    });

    res.json(updatedPrefs);
  } catch (err) {
    // If record to update not found, create it
    if (err.code === 'P2025') {
        try {
            const newPrefs = await prisma.user_preferences.create({
                data: {
                    user_id: req.user.id,
                    ...req.body
                }
            });
            return res.json(newPrefs);
        } catch (createErr) {
            return res.status(500).json({ detail: createErr.message });
        }
    }
    res.status(500).json({ detail: err.message });
  }
});

// PUT update profile
router.put('/profile', async (req, res) => {
    try {
        const { full_name } = req.body;
        if (!full_name) return res.status(400).json({ detail: "Name is required" });

        const user = await prisma.users.update({
            where: { id: req.user.id },
            data: { full_name }
        });

        res.json({ id: user.id, email: user.email, full_name: user.full_name });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

// POST change password
router.post('/password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) return res.status(400).json({ detail: "Passwords required" });

        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ detail: "User not found" });

        const isMatch = await bcrypt.compare(current_password, user.hashed_password);
        if (!isMatch) return res.status(400).json({ detail: "Invalid current password" });

        const hashed = await bcrypt.hash(new_password, 10);
        await prisma.users.update({
            where: { id: req.user.id },
            data: { hashed_password: hashed }
        });

        res.json({ success: true, message: "Password updated" });
    } catch (err) {
        res.status(500).json({ detail: err.message });
    }
});

module.exports = router;
