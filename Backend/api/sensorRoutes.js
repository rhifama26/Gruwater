const express = require('express');
const { ingest } = require('../controllers/sensorController');

const router = express.Router();
router.post('/ingest', ingest);

module.exports = router;
