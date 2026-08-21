const express = require('express');
const PredictionInputController = require('../controllers/predictionInputController');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);
router.get('/', PredictionInputController.getAll);
router.get('/stats', PredictionInputController.getStats);

module.exports = router;
