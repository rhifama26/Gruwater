const db = require('../config/database');

const Prediction = {
  findAll: async (userId = null, lokasi = null) => {
    const [rows] = await db.query('SELECT * FROM predictions WHERE user_id = ? AND (? IS NULL OR lokasi = ?) ORDER BY tanggal_prediksi DESC', [userId, lokasi, lokasi]);
    return rows;
  },
  findLatest: async (userId = null, lokasi = null) => {
    const [rows] = await db.query('SELECT * FROM predictions WHERE user_id = ? AND (? IS NULL OR lokasi = ?) ORDER BY step_ke ASC', [userId, lokasi, lokasi]);
    return rows;
  },
  createBatch: async (predictions) => {
    if (!predictions.length) return 0;
    const cols = '(user_id, lokasi, tanggal_prediksi, step_ke, suhu, pH, salinitas, kekeruhan, skor_risiko, status, rekomendasi, model_log_id)';
    const values = predictions.map((p) => [
      p.user_id,
      p.lokasi ?? null,
      p.tanggal_prediksi,
      p.step_ke,
      p.suhu,
      p.pH,
      p.salinitas,
      p.kekeruhan,
      p.skor_risiko,
      p.status,
      p.rekomendasi,
      p.model_log_id ?? null
    ]);
    const [result] = await db.query(`INSERT INTO predictions ${cols} VALUES ?`, [values]);
    return result.affectedRows;
  },
  deleteAll: async (userId = null, lokasi = null) => {
    const [result] = await db.query('DELETE FROM predictions WHERE user_id = ? AND (? IS NULL OR lokasi = ?)', [userId, lokasi, lokasi]);
    return result.affectedRows;
  },
  getStats: async (userId = null) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'Normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN status = 'Waspada' THEN 1 ELSE 0 END) as waspada_count,
      SUM(CASE WHEN status = 'Bahaya' THEN 1 ELSE 0 END) as bahaya_count
      FROM predictions
      WHERE user_id = ?
    `, [userId]);
    return rows[0];
  }
};

module.exports = Prediction;