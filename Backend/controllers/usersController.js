const User = require('../models/userModel');
const { validateUser } = require('../utils/validation');

const UsersController = {
  getAll: async (req, res) => {
    try {
      const users = await User.findAll();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  create: async (req, res) => {
    try {
      const errors = validateUser(req.body);
      if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
      const id = await User.create(req.body);
      const user = await User.findById(id);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  update: async (req, res) => {
    try {
      const affected = await User.update(req.params.id, req.body);
      if (!affected) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      const user = await User.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  delete: async (req, res) => {
    try {
      if (parseInt(req.params.id) === 1) return res.status(400).json({ success: false, message: 'Tidak bisa hapus admin utama' });
      const affected = await User.delete(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
      res.json({ success: true, message: 'User dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = UsersController;