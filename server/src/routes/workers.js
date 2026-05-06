const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const workerController = require('../controllers/workerController');

router.get('/', auth, requireAdmin, workerController.getWorkers);
router.get('/:id', auth, workerController.getWorker);

module.exports = router;
