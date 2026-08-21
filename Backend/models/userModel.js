const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },
  findById: async (id) => {
    const [rows] = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  findAll: async () => {
    const [rows] = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows;
  },
  create: async (userData) => {
    const hashed = await bcrypt.hash(userData.password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [userData.username, userData.email, hashed, userData.role || 'user']
    );
    return result.insertId;
  },
  update: async (id, data) => {
    const fields = [];
    const values = [];
    if (data.username) { fields.push('username = ?'); values.push(data.username); }
    if (data.email) { fields.push('email = ?'); values.push(data.email); }
    if (data.password) { fields.push('password = ?'); values.push(await bcrypt.hash(data.password, 10)); }
    if (data.role) { fields.push('role = ?'); values.push(data.role); }
    if (fields.length === 0) return 0;
    values.push(id);
    const [result] = await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },
  delete: async (id) => {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
  },
  comparePassword: async (plain, hashed) => bcrypt.compare(plain, hashed)
};

module.exports = User;