const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const attendanceController = require('../controllers/attendanceController');

router.get('/today', auth, attendanceController.getToday);
router.post('/status', auth, attendanceController.updateStatus);
router.get('/team/today', auth, attendanceController.getTeamToday);
router.get('/summary', auth, requireAdmin, attendanceController.getSummary);

module.exports = router;
