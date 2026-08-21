const express = require('express');
const ModelController = require('../controllers/modelController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();
router.use(auth);

router.get('/logs', ModelController.getAllLogs);
router.get('/best', ModelController.getBestModel);
router.get('/latest', ModelController.getLatestLog);
router.get('/config', ModelController.getCurrentConfig);
router.get('/compare', ModelController.getComparison);

router.post('/optimize', role(['admin']), ModelController.runOptimization);

module.exports = router;