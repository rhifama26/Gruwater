const express = require('express');
const DataController = require('../controllers/dataController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();
router.use(auth);

router.get('/', DataController.getAll);
router.get('/latest-per-lokasi', DataController.getLatestPerLokasi);
router.get('/latest', DataController.getLatest);
router.get('/lastday', DataController.getLastDay);
router.get('/stats', DataController.getStats);
router.get('/:id', DataController.getById);

router.post('/', role(['admin', 'user']), DataController.create);
router.put('/:id', role(['admin', 'user']), DataController.update);
router.delete('/:id', role(['admin', 'user']), DataController.delete);

module.exports = router;