const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const assignmentController = require('../controllers/assignmentController');

router.get('/', auth, assignmentController.getAssignments);
router.get('/:id', auth, assignmentController.getAssignment);
router.post('/', auth, requireAdmin, assignmentController.createAssignment);
router.patch('/:id/status', auth, assignmentController.updateStatus);

module.exports = router;
