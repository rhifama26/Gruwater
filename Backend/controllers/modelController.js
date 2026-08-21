const fs = require('fs');
const path = require('path');
const ModelLog = require('../models/modelLogModel');
const Comparison = require('../models/comparisonModel');

const DEFAULT_TFT = { model_type: 'tft', mape: 57.08, rmse: 0.908, mae: 0.792, r2: -0.075 };
const DEFAULT_GRU = { model_type: 'gru', mape: 22.85, rmse: 0.4848, mae: 0.3437, r2: 0.8174 };

const PARAMS_PATH = path.join(__dirname, '../../Training/saved_models/best_params.json');
const METRICS_PATH = path.join(__dirname, '../../Training/outputs/metrics_filtered.json');

const ModelController = {
  getAllLogs: async (req, res) => {
    try {
      const logs = await ModelLog.findAll();
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getBestModel: async (req, res) => {
    try {
      const best = await ModelLog.findBest();
      if (!best) return res.status(404).json({ success: false, message: 'Belum ada model' });
      res.json({ success: true, data: best });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getLatestLog: async (req, res) => {
    try {
      const latest = await ModelLog.findLatest();
      if (!latest) return res.status(404).json({ success: false, message: 'Belum ada log' });
      res.json({ success: true, data: latest });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  runOptimization: async (req, res) => {
    try {
      // Tombol ini BUKAN menjalankan training.
      // Ia membaca hasil training yang sudah ada di folder Training/
      // (hasil `python train.py` manual) lalu menyinkronkannya ke database.
      if (!fs.existsSync(PARAMS_PATH)) {
        return res.status(400).json({ success: false, message: 'Hasil training tidak ditemukan. Jalankan train.py terlebih dahulu.' });
      }

      const params = JSON.parse(fs.readFileSync(PARAMS_PATH, 'utf-8'));
      const hp = params.hyperparameters || {};

      let rmse = null;
      const metricsPath = path.join(__dirname, '../../Training/outputs/metrics.json');
      if (fs.existsSync(metricsPath)) {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
        rmse = metrics.metrics?.total?.rmse ?? null;
      }

      const logId = await ModelLog.create({
        units: hp.units ?? 64,
        learning_rate: hp.learning_rate ?? 0.001,
        dropout_rate: hp.dropout_rate ?? 0.2,
        batch_size: hp.batch_size ?? 32,
        epochs: hp.epochs ?? 100,
        rmse,
        status: 'completed',
        completed_at: new Date()
      });

      // Update perbandingan GRU dari metrics_filtered.json
      if (fs.existsSync(METRICS_PATH)) {
        const data = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
        const kekeruhan = data.metrics?.per_parameter?.Kekeruhan;
        if (kekeruhan) {
          await Comparison.upsert('gru', {
            mape: kekeruhan.mape,
            rmse: kekeruhan.rmse,
            mae: kekeruhan.mae,
            r2: kekeruhan.r2
          });
        }
      }

      res.json({ success: true, message: 'Hasil training berhasil disinkronkan', logId });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getComparison: async (req, res) => {
    try {
      const metricsPath = path.join(__dirname, '../../Training/outputs/metrics_filtered.json');
      if (fs.existsSync(metricsPath)) {
        const data = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
        const kekeruhan = data.metrics?.per_parameter?.Kekeruhan;
        if (kekeruhan) {
          await Comparison.upsert('gru', {
            mape: kekeruhan.mape,
            rmse: kekeruhan.rmse,
            mae: kekeruhan.mae,
            r2: kekeruhan.r2
          });
        }
      }

      let tft = null;
      let gru = null;
      try {
        tft = await Comparison.findByType('tft');
        gru = await Comparison.findByType('gru');
      } catch (error) {
        console.error('Tabel comparison_metrics belum ada:', error.message);
      }

      if (!tft) tft = DEFAULT_TFT;
      if (!gru) gru = DEFAULT_GRU;

      res.json({ success: true, data: { tft, gru } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getCurrentConfig: async (req, res) => {
    try {
      let best = await ModelLog.findBest();

      if (!best) {
        const modelPath = path.join(__dirname, '../../Training/saved_models/best_gru_model.h5');
        const paramsPath = path.join(__dirname, '../../Training/saved_models/best_params.json');

        if (fs.existsSync(modelPath) && fs.existsSync(paramsPath)) {
          const params = JSON.parse(fs.readFileSync(paramsPath, 'utf-8'));
          const hp = params.hyperparameters || {};
          const metrics = params.metrics?.total || {};

          const logId = await ModelLog.create({
            units: hp.units || 64,
            learning_rate: hp.learning_rate || 0.001,
            dropout_rate: hp.dropout_rate || 0.2,
            batch_size: hp.batch_size || 32,
            epochs: hp.epochs || 100,
            rmse: metrics.rmse || null,
            status: 'completed',
            completed_at: new Date()
          });

          best = await ModelLog.findById(logId);
        }
      }

      if (!best) return res.json({ success: true, data: { is_optimized: false } });
      res.json({ success: true, data: { ...best, is_optimized: true } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = ModelController;