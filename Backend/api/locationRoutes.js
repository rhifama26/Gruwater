const express = require('express');
const LocationController = require('../controllers/locationController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();
router.use(auth);

router.get('/', LocationController.getAll);
router.get('/:id', LocationController.getById);

router.post('/', role(['admin']), LocationController.create);
router.put('/:id', role(['admin']), LocationController.update);
router.delete('/:id', role(['admin']), LocationController.delete);

module.exports = router;
