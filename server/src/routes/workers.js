const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const workerController = require('../controllers/workerController');

router.get('/', auth, requireAdmin, workerController.getWorkers);
router.post('/', auth, requireAdmin, workerController.createWorker);
router.get('/:id', auth, workerController.getWorker);
router.put('/:id', auth, requireAdmin, workerController.updateWorker);
router.delete('/:id', auth, requireAdmin, workerController.deleteWorker);
router.patch('/:id/team', auth, requireAdmin, workerController.updateWorkerTeam);

module.exports = router;
