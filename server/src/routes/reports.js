const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.get('/', auth, reportController.getReports);
router.get('/:id', auth, reportController.getReport);
router.post('/', auth, reportController.submitReport);

module.exports = router;
