const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const auditLogController = require('../controllers/auditLogController');

router.get('/', auth, requireAdmin, auditLogController.getAuditLogs);

module.exports = router;
