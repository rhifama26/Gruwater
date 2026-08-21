const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const Prediction = require('../models/predictionModel');
const Data = require('../models/dataModel');
const PredictionInput = require('../models/predictionInputModel');
const { calculateRiskScore, getMitigationRecommendation } = require('../utils/helpers');

const PYTHON = process.env.PYTHON_PATH || path.join(__dirname, '../../Training/.venv310/Scripts/python.exe');
const PREDICT_SCRIPT = path.join(__dirname, '../../Training/predict.py');
const MODEL_FILE = path.join(__dirname, '../../Training/saved_models/best_gru_model.h5');

const runPythonPrediction = (history, steps) =>
  new Promise((resolve, reject) => {
    execFile(PYTHON, [PREDICT_SCRIPT, JSON.stringify({ history, steps })], { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.success) return reject(new Error(parsed.error || 'Prediksi gagal'));
        resolve(parsed.predictions);
      } catch (e) {
        reject(e);
      }
    });
  });

const PredictionController = {
  getAll: async (req, res) => {
    try {
      const data = await Prediction.findAll(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getLatest: async (req, res) => {
    try {
      const lokasi = req.query.lokasi || null;
      const data = await Prediction.findLatest(req.user.id, lokasi);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  getDashboard: async (req, res) => {
    try {
      const predictions = await Prediction.findAll(req.user.id);
      const rank = { Normal: 0, Waspada: 1, Bahaya: 2 };

      const byLokasi = {};
      predictions.forEach((p) => {
        const key = p.lokasi || 'Tanpa Lokasi';
        if (!byLokasi[key]) byLokasi[key] = [];
        byLokasi[key].push(p);
      });

      const perLokasi = Object.keys(byLokasi).map((lokasi) => {
        const rows = byLokasi[lokasi];
        let worst = rows[0];
        rows.forEach((r) => {
          if (
            rank[r.status] > rank[worst.status] ||
            (rank[r.status] === rank[worst.status] && Number(r.skor_risiko) < Number(worst.skor_risiko))
          ) {
            worst = r;
          }
        });
        return {
          lokasi,
          suhu: worst.suhu,
          pH: worst.pH,
          salinitas: worst.salinitas,
          kekeruhan: worst.kekeruhan,
          skor_risiko: worst.skor_risiko,
          status: worst.status,
          rekomendasi: worst.rekomendasi
        };
      });

      const n = predictions.length;
      const avg = (key) => (n ? predictions.reduce((s, p) => s + parseFloat(p[key] || 0), 0) / n : 0);
      const stats = {
        total_data: n,
        avg_suhu: avg('suhu'),
        avg_pH: avg('pH'),
        avg_salinitas: avg('salinitas'),
        avg_kekeruhan: avg('kekeruhan'),
        normal_count: predictions.filter((p) => p.status === 'Normal').length,
        waspada_count: predictions.filter((p) => p.status === 'Waspada').length,
        bahaya_count: predictions.filter((p) => p.status === 'Bahaya').length
      };

      const maxSteps = Math.max(0, ...Object.values(byLokasi).map((a) => a.length));
      const series = [];
      for (let i = 1; i <= maxSteps; i++) {
        const steps = predictions.filter((p) => Number(p.step_ke) === i);
        if (!steps.length) continue;
        const avg2 = (key) => steps.reduce((s, p) => s + parseFloat(p[key] || 0), 0) / steps.length;
        series.push({
          step_ke: i,
          suhu: +avg2('suhu').toFixed(2),
          pH: +avg2('pH').toFixed(2),
          salinitas: +avg2('salinitas').toFixed(2),
          kekeruhan: +avg2('kekeruhan').toFixed(2)
        });
      }

      res.json({ success: true, data: { stats, perLokasi, series } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  runPrediction: async (req, res) => {
    try {
      let { suhu, pH, salinitas, kekeruhan, waktu, lokasi } = req.body;
      lokasi = lokasi || null;

      if (suhu === undefined || pH === undefined || salinitas === undefined || kekeruhan === undefined) {
        const latest = await Data.findLatest(req.user.id, lokasi);
        if (!latest) return res.status(400).json({ success: false, message: 'Tidak ada data terbaru. Isi nilai parameter manual.' });
        suhu = latest.suhu;
        pH = latest.pH;
        salinitas = latest.salinitas;
        kekeruhan = latest.kekeruhan;
      }

      suhu = parseFloat(suhu);
      pH = parseFloat(pH);
      salinitas = parseFloat(salinitas);
      kekeruhan = parseFloat(kekeruhan);

      if ([suhu, pH, salinitas, kekeruhan].some((v) => !Number.isFinite(v))) {
        return res.status(400).json({ success: false, message: 'Semua parameter (suhu, pH, salinitas, kekeruhan) harus diisi dengan angka yang valid' });
      }

      const inputParams = { suhu, pH, salinitas, kekeruhan };
      const startDate = waktu ? new Date(waktu) : new Date();

      await Prediction.deleteAll(req.user.id, lokasi);

      // Bangun window 24 timestep
      let window;
      const inputProvided = req.body.suhu !== undefined && req.body.pH !== undefined && req.body.salinitas !== undefined && req.body.kekeruhan !== undefined;

      if (inputProvided) {
        // User mengisi nilai manual: window mengikuti nilai input, bukan riwayat DB
        window = Array.from({ length: 24 }, () => [suhu, pH, salinitas, kekeruhan]);
      } else {
        // Tidak mengisi: gunakan riwayat terbaru DB
        const historyRows = await Data.findAll(23, 0, req.user.id, lokasi);
        historyRows.reverse();
        window = historyRows.map((r) => [r.suhu, r.pH, r.salinitas, r.kekeruhan]);
        while (window.length < 23) window.unshift([suhu, pH, salinitas, kekeruhan]);
        window.push([suhu, pH, salinitas, kekeruhan]);
      }

      let rawPredictions = null;
      if (fs.existsSync(PYTHON) && fs.existsSync(PREDICT_SCRIPT) && fs.existsSync(MODEL_FILE)) {
        try {
          rawPredictions = await runPythonPrediction(window, 96);
          console.log('Prediksi menggunakan model GRU (PSO)');
        } catch (error) {
          console.error('Python prediction error, fallback ke simulasi:', error.message);
        }
      } else {
        console.log('Model GRU tidak ditemukan, fallback ke simulasi');
      }

      // Simulasi prediksi 96 langkah (15 menit, 1 hari ke depan)
      const predictions = [];
      for (let i = 1; i <= 96; i++) {
        if (rawPredictions && rawPredictions[i - 1]) {
          suhu = +rawPredictions[i - 1][0].toFixed(2);
          pH = +rawPredictions[i - 1][1].toFixed(2);
          salinitas = +rawPredictions[i - 1][2].toFixed(2);
          kekeruhan = +rawPredictions[i - 1][3].toFixed(2);
        } else {
          suhu = +(suhu + (Math.random() - 0.5) * 0.2).toFixed(2);
          pH = +(pH + (Math.random() - 0.5) * 0.03).toFixed(2);
          salinitas = +(salinitas + (Math.random() - 0.5) * 0.15).toFixed(2);
          kekeruhan = +(kekeruhan + (Math.random() - 0.5) * 0.15).toFixed(2);
          suhu = Math.min(32, Math.max(26, suhu));
          pH = Math.min(8.5, Math.max(7.0, pH));
          salinitas = Math.min(35, Math.max(10, salinitas));
          kekeruhan = Math.min(5, Math.max(0, kekeruhan));
        }

        const risk = calculateRiskScore(suhu, pH, salinitas, kekeruhan);
        const rekomendasi = getMitigationRecommendation(risk.status);

        const date = new Date(startDate.getTime() + (i - 1) * 15 * 60 * 1000);
        const pad2 = (n) => String(n).padStart(2, '0');
        const localDate =
          date.getFullYear() + '-' +
          pad2(date.getMonth() + 1) + '-' +
          pad2(date.getDate()) + ' ' +
          pad2(date.getHours()) + ':' +
          pad2(date.getMinutes()) + ':' +
          pad2(date.getSeconds());
        predictions.push({
          user_id: req.user.id,
          lokasi,
          tanggal_prediksi: localDate,
          step_ke: i,
          suhu,
          pH,
          salinitas,
          kekeruhan,
          skor_risiko: risk.skor,
          status: risk.status,
          rekomendasi,
          model_log_id: null
        });
      }

      await Prediction.createBatch(predictions);
      await PredictionInput.create({
        user_id: req.user.id,
        lokasi,
        tanggal_prediksi: startDate,
        nilai_parameter: inputParams
      });

      const saved = await Prediction.findLatest(req.user.id, lokasi);
      res.json({ success: true, data: saved });
    } catch (error) {
      console.error('Prediction error:', error.message);
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  }
};

module.exports = PredictionController;