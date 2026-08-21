const db = require('../config/database');

const Data = {
  findAll: async (limit = 50, offset = 0, userId = null, lokasi = null) => {
    const [rows] = await db.query('SELECT id, DATE_FORMAT(tanggal, \'%Y-%m-%d\') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE user_id = ? AND (? IS NULL OR lokasi = ?) ORDER BY tanggal DESC LIMIT ? OFFSET ?', [userId, lokasi, lokasi, parseInt(limit), parseInt(offset)]);
    return rows;
  },
  findLatest: async (userId = null, lokasi = null) => {
    const [rows] = await db.query('SELECT id, DATE_FORMAT(tanggal, \'%Y-%m-%d\') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE user_id = ? AND (? IS NULL OR lokasi = ?) ORDER BY tanggal DESC LIMIT 1', [userId, lokasi, lokasi]);
    return rows[0];
  },
  findAllForUser: async (userId = null) => {
    const [rows] = await db.query('SELECT id, DATE_FORMAT(tanggal, \'%Y-%m-%d\') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE user_id = ? ORDER BY tanggal DESC, id DESC', [userId]);
    return rows;
  },
  findAllExport: async (userId = null, lokasi = null) => {
    const [rows] = await db.query('SELECT id, tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE user_id = ? AND (? IS NULL OR lokasi = ?) ORDER BY tanggal ASC, id ASC', [userId, lokasi, lokasi]);
    return rows;
  },
  findLastDay: async (userId = null) => {
    const [rows] = await db.query('SELECT id, DATE_FORMAT(tanggal, \'%Y-%m-%d\') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE user_id = ? AND tanggal = (SELECT MAX(tanggal) FROM water_quality_data WHERE user_id = ?) ORDER BY tanggal DESC, id DESC', [userId, userId]);
    return rows;
  },
  findById: async (id, userId = null) => {
    const [rows] = await db.query('SELECT id, DATE_FORMAT(tanggal, \'%Y-%m-%d\') as tanggal, lokasi, suhu, pH, salinitas, kekeruhan FROM water_quality_data WHERE id = ? AND user_id = ?', [id, userId]);
    return rows[0];
  },
  create: async (data) => {
    const [result] = await db.query(
      'INSERT INTO water_quality_data (user_id, tanggal, lokasi, suhu, pH, salinitas, kekeruhan) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.user_id, data.tanggal, data.lokasi, data.suhu, data.pH, data.salinitas, data.kekeruhan]
    );
    return result.insertId;
  },
  update: async (id, data, userId = null) => {
    const [result] = await db.query(
      'UPDATE water_quality_data SET tanggal=?, lokasi=?, suhu=?, pH=?, salinitas=?, kekeruhan=? WHERE id=? AND user_id=?',
      [data.tanggal, data.lokasi, data.suhu, data.pH, data.salinitas, data.kekeruhan, id, userId]
    );
    return result.affectedRows;
  },
  delete: async (id, userId = null) => {
    const [result] = await db.query('DELETE FROM water_quality_data WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows;
  },
  count: async (userId = null) => {
    const [rows] = await db.query('SELECT COUNT(*) as total FROM water_quality_data WHERE user_id = ?', [userId]);
    return rows[0].total;
  },
  getStats: async (userId = null) => {
    const [rows] = await db.query('SELECT COUNT(*) as total_data, AVG(suhu) as avg_suhu, AVG(pH) as avg_pH, AVG(salinitas) as avg_salinitas, AVG(kekeruhan) as avg_kekeruhan FROM water_quality_data WHERE user_id = ?', [userId]);
    return rows[0];
  }
};

module.exports = Data;