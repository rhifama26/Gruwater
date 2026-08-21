const PredictionInput = require('../models/predictionInputModel');

const PredictionInputController = {
  getAll: async (req, res) => {
    try {
      const data = await PredictionInput.findAll(req.user.role === 'admin' ? null : req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
  getStats: async (req, res) => {
    try {
      const stats = await PredictionInput.getStats(req.user.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = PredictionInputController;
