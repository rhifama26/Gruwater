const express = require('express');
const PredictionController = require('../controllers/predictionController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();
router.use(auth);

router.get('/', PredictionController.getAll);
router.get('/latest', PredictionController.getLatest);
router.get('/dashboard', PredictionController.getDashboard);
router.post('/run', role(['admin', 'user']), PredictionController.runPrediction);

module.exports = router;