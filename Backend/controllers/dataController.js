const fs = require('fs');
const path = require('path');
const Data = require('../models/dataModel');
const { validateWaterQualityData } = require('../utils/validation');
const { calculateRiskScore, getMitigationRecommendation } = require('../utils/helpers');

const DATA_MASUK_DIR = path.join(__dirname, '..', '..', 'data_masuk');

const appendToCsv = (row) => {
  try {
    if (!fs.existsSync(DATA_MASUK_DIR)) fs.mkdirSync(DATA_MASUK_DIR, { recursive: true });
    const file = path.join(DATA_MASUK_DIR, `sensor_${new Date().toISOString().slice(0, 10)}.csv`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, 'id,tanggal,lokasi,suhu,pH,salinitas,kekeruhan\n');
    }
    fs.appendFileSync(file, `${row.id},${row.tanggal},${row.lokasi},${row.suhu},${row.pH},${row.salinitas},${row.kekeruhan}\n`);
  } catch (err) {
    console.error('Gagal menulis CSV data_masuk:', err.message);
  }
};

const DataController = {
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      const data = await Data.findAll(limit, offset, req.user.id);
      const total = await Data.count(req.user.id);
      res.json({ success: true, data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getLatest: async (req, res) => {
    try {
      const data = await Data.findLatest(req.user.id);
      if (!data) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      const risk = calculateRiskScore(data.suhu, data.pH, data.salinitas, data.kekeruhan);
      const rekomendasi = getMitigationRecommendation(risk.status);
      res.json({ success: true, data: { ...data, skor_risiko: risk.skor, status: risk.status, rekomendasi } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getLastDay: async (req, res) => {
    try {
      const data = await Data.findLastDay(req.user.id);
      const enriched = data.map(d => {
        const risk = calculateRiskScore(d.suhu, d.pH, d.salinitas, d.kekeruhan);
        return { ...d, skor_risiko: risk.skor, status: risk.status };
      });
      res.json({ success: true, data: enriched });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getLatestPerLokasi: async (req, res) => {
    try {
      const data = await Data.findLastDay(req.user.id);
      const worst = {};
      data.forEach((d) => {
        const risk = calculateRiskScore(d.suhu, d.pH, d.salinitas, d.kekeruhan);
        const rekomendasi = getMitigationRecommendation(risk.status);
        const enriched = { ...d, skor_risiko: risk.skor, status: risk.status, rekomendasi };
        if (!worst[d.lokasi] || enriched.skor_risiko < worst[d.lokasi].skor_risiko) {
          worst[d.lokasi] = enriched;
        }
      });
      res.json({ success: true, data: Object.values(worst) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getById: async (req, res) => {
    try {
      const data = await Data.findById(req.params.id, req.user.id);
      if (!data) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      const risk = calculateRiskScore(data.suhu, data.pH, data.salinitas, data.kekeruhan);
      res.json({ success: true, data: { ...data, skor_risiko: risk.skor, status: risk.status } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  create: async (req, res) => {
    try {
      const errors = validateWaterQualityData(req.body);
      if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
      const id = await Data.create({ ...req.body, user_id: req.user.id });
      const newData = await Data.findById(id, req.user.id);
      appendToCsv(newData);
      res.status(201).json({ success: true, data: newData });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  update: async (req, res) => {
    try {
      const errors = validateWaterQualityData(req.body);
      if (errors.length) return res.status(400).json({ success: false, message: errors.join(', ') });
      const affected = await Data.update(req.params.id, req.body, req.user.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      const updated = await Data.findById(req.params.id, req.user.id);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  delete: async (req, res) => {
    try {
      const affected = await Data.delete(req.params.id, req.user.id);
      if (!affected) return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      res.json({ success: true, message: 'Data dihapus' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await Data.getStats(req.user.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = DataController;