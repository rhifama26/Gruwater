const db = require('../config/database');

const Lokasi = {
  findAll: async () => {
    const [rows] = await db.query('SELECT * FROM lokasi_tambak ORDER BY nama_lokasi ASC');
    return rows;
  },
  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM lokasi_tambak WHERE id = ?', [id]);
    return rows[0];
  },
  create: async (data) => {
    const [result] = await db.query(
      'INSERT INTO lokasi_tambak (user_id, nama_lokasi, keterangan) VALUES (?, ?, ?)',
      [data.user_id, data.nama_lokasi, data.keterangan || null]
    );
    return result.insertId;
  },
  update: async (id, data) => {
    const [result] = await db.query(
      'UPDATE lokasi_tambak SET nama_lokasi = ?, keterangan = ? WHERE id = ?',
      [data.nama_lokasi, data.keterangan || null, id]
    );
    return result.affectedRows;
  },
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM lokasi_tambak WHERE id = ?', [id]);
    return result.affectedRows;
  }
};

module.exports = Lokasi;
