const db = require('../config/database');

const Comparison = {
  findByType: async (modelType) => {
    const [rows] = await db.query('SELECT * FROM comparison_metrics WHERE model_type = ?', [modelType]);
    return rows[0];
  },
  upsert: async (modelType, data) => {
    await db.query(
      'INSERT INTO comparison_metrics (model_type, mape, rmse, mae, r2) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mape = VALUES(mape), rmse = VALUES(rmse), mae = VALUES(mae), r2 = VALUES(r2)',
      [modelType, data.mape, data.rmse, data.mae, data.r2]
    );
  }
};

module.exports = Comparison;
