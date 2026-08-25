const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const reportController = require('../controllers/reportController');
const reportSummaryController = require('../controllers/reportSummaryController');

router.get('/', auth, reportController.getReports);
// '/:id' より先に定義しないと 'summary' が :id として拾われてしまう
router.get('/summary', auth, requireAdmin, reportSummaryController.getSummary);
router.get('/:id', auth, reportController.getReport);
router.post('/', auth, reportController.submitReport);

module.exports = router;
