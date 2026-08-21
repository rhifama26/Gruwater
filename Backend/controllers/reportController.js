const Data = require('../models/dataModel');
const Prediction = require('../models/predictionModel');
const History = require('../models/predictionInputModel');
const { calculateRiskScore } = require('../utils/helpers');
const XLSX = require('xlsx');

const ReportController = {
  getFullReport: async (req, res) => {
    try {
      const data = await Data.findAll(10000, 0, req.user.id);
      const predictions = await Prediction.findAll(req.user.id);
      const history = await History.findAll(req.user.id);
      const stats = await Data.getStats(req.user.id);
      const predStats = await Prediction.getStats(req.user.id);
      const histStats = await History.getStats(req.user.id);

      const enriched = data.map(d => {
        const risk = calculateRiskScore(d.suhu, d.pH, d.salinitas, d.kekeruhan);
        return { ...d, skor_risiko: risk.skor, status: risk.status };
      });

      res.json({
        success: true,
        data: {
          summary: { ...stats, ...histStats, ...predStats },
          data: enriched,
          predictions,
          history
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  exportExcel: async (req, res) => {
    try {
      const { lokasi = '' } = req.query;
      const includePrediksi = req.query.prediksi !== 'false';

      const wb = XLSX.utils.book_new();

      if (includePrediksi) {
        const predictions = await Prediction.findAll(req.user.id);
        const filtered = lokasi ? predictions.filter((p) => p.lokasi === lokasi) : predictions;
        const sorted = [...filtered].sort((a, b) => (a.lokasi || '').localeCompare(b.lokasi || '') || Number(a.step_ke) - Number(b.step_ke));
        const rows = sorted.map((p) => ({
          'Tanggal Prediksi': p.tanggal_prediksi,
          Lokasi: p.lokasi,
          'Step Ke': p.step_ke,
          Suhu: p.suhu,
          pH: p.pH,
          Salinitas: p.salinitas,
          Kekeruhan: p.kekeruhan,
          'Skor Risiko': p.skor_risiko,
          Status: p.status,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Prediksi');
      }

      const data = await Data.findAllExport(req.user.id, lokasi || null);
      const dataRows = data.map((d) => ({
        Tanggal: d.tanggal,
        Lokasi: d.lokasi,
        Suhu: d.suhu,
        pH: d.pH,
        Salinitas: d.salinitas,
        Kekeruhan: d.kekeruhan,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dataRows.length ? dataRows : [{ Tanggal: 'Tidak ada data kualitas air' }]),
        'Data Kualitas Air'
      );

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=laporan_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = ReportController;