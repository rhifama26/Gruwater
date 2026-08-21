const express = require('express');
const ReportController = require('../controllers/reportController');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);
router.get('/full', ReportController.getFullReport);
router.get('/export/excel', ReportController.exportExcel);

module.exports = router;