const db = require('../config/database');

const ModelLog = {
  findAll: async () => {
    const [rows] = await db.query('SELECT * FROM model_logs ORDER BY created_at DESC');
    return rows;
  },
  findBest: async () => {
    const [rows] = await db.query('SELECT * FROM model_logs WHERE status = "completed" ORDER BY rmse ASC LIMIT 1');
    return rows[0];
  },
  findLatest: async () => {
    const [rows] = await db.query('SELECT * FROM model_logs ORDER BY created_at DESC LIMIT 1');
    return rows[0];
  },
  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM model_logs WHERE id = ?', [id]);
    return rows[0];
  },
  create: async (data) => {
    const [result] = await db.query(
      'INSERT INTO model_logs (units, learning_rate, dropout_rate, batch_size, epochs, rmse, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.units, data.learning_rate, data.dropout_rate, data.batch_size, data.epochs, data.rmse || null, data.status || 'pending', data.completed_at || null]
    );
    return result.insertId;
  },
  update: async (id, data) => {
    const fields = [];
    const values = [];
    if (data.units !== undefined) { fields.push('units = ?'); values.push(data.units); }
    if (data.learning_rate !== undefined) { fields.push('learning_rate = ?'); values.push(data.learning_rate); }
    if (data.dropout_rate !== undefined) { fields.push('dropout_rate = ?'); values.push(data.dropout_rate); }
    if (data.batch_size !== undefined) { fields.push('batch_size = ?'); values.push(data.batch_size); }
    if (data.epochs !== undefined) { fields.push('epochs = ?'); values.push(data.epochs); }
    if (data.rmse !== undefined) { fields.push('rmse = ?'); values.push(data.rmse); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.query(`UPDATE model_logs SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  }
};

module.exports = ModelLog;