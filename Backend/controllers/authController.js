const User = require('../models/userModel');
const { validateLogin, validateUser } = require('../utils/validation');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const AuthController = {
  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const errors = validateUser({ username, email, password });
      if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });

      const existing = await User.findByUsername(username);
      if (existing) return res.status(400).json({ success: false, message: 'Username sudah digunakan' });

      const id = await User.create({ username, email, password, role: 'user' });
      const user = await User.findById(id);

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: { id: user.id, username: user.username, email: user.email, role: user.role }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const errors = validateLogin({ username, password });
      if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });

      const user = await User.findByUsername(username);
      if (!user) return res.status(401).json({ success: false, message: 'Username atau password salah' });

      const valid = await User.comparePassword(password, user.password);
      if (!valid) return res.status(401).json({ success: false, message: 'Username atau password salah' });

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, username: user.username, email: user.email, role: user.role }
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  logout: (req, res) => {
    res.json({ success: true, message: 'Logout berhasil' });
  }
};

module.exports = AuthController;