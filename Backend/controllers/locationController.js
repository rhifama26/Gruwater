const Lokasi = require('../models/locationModel');

const LocationController = {
  getAll: async (req, res) => {
    try {
      const data = await Lokasi.findAll();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getById: async (req, res) => {
    try {
      const data = await Lokasi.findById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan' });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  create: async (req, res) => {
    try {
      if (!req.body.nama_lokasi || !req.body.nama_lokasi.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lokasi harus diisi' });
      }
      const id = await Lokasi.create({ ...req.body, user_id: req.user.id });
      const newData = await Lokasi.findById(id);
      res.status(201).json({ success: true, data: newData });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  update: async (req, res) => {
    try {
      if (!req.body.nama_lokasi || !req.body.nama_lokasi.trim()) {
        return res.status(400).json({ success: false, message: 'Nama lokasi harus diisi' });
      }
      const affected = await Lokasi.update(req.params.id, req.body);
      if (!affected) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan' });
      const updated = await Lokasi.findById(req.params.id);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  delete: async (req, res) => {
    try {
      const affected = await Lokasi.delete(req.params.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan' });
      res.json({ success: true, message: 'Lokasi dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = LocationController;
