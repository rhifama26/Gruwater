const db = require('../config/database');

const PredictionInput = {
  findAll: async (userId = null) => {
    const where = userId ? 'WHERE pi.user_id = ?' : '';
    const [rows] = await db.query(
      `SELECT pi.*, u.username, u.email
       FROM prediction_inputs pi
       JOIN users u ON u.id = pi.user_id
       ${where}
       ORDER BY pi.created_at DESC`,
      userId ? [userId] : []
    );
    return rows;
  },
  create: async (data) => {
    const [result] = await db.query(
      'INSERT INTO prediction_inputs (user_id, lokasi, tanggal_prediksi, nilai_parameter) VALUES (?, ?, ?, ?)',
      [data.user_id, data.lokasi || null, data.tanggal_prediksi, JSON.stringify(data.nilai_parameter)]
    );
    return result.insertId;
  },
  deleteAll: async (userId = null) => {
    const [result] = await db.query('DELETE FROM prediction_inputs WHERE user_id = ?', [userId]);
    return result.affectedRows;
  },
  getStats: async (userId = null) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM prediction_inputs
      WHERE user_id = ?
    `, [userId]);
    return rows[0];
  }
};

module.exports = PredictionInput;
