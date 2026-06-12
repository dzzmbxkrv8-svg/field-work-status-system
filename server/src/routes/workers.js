const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const workerController = require('../controllers/workerController');

router.get('/', auth, requireAdmin, workerController.getWorkers);
router.post('/', auth, requireAdmin, workerController.createWorker);
// 承認待ち一覧・承認（/:id より先に定義）
router.get('/pending', auth, requireAdmin, workerController.getPendingWorkers);
router.patch('/:id/approve', auth, requireAdmin, workerController.approveWorker);
router.get('/:id', auth, workerController.getWorker);
router.put('/:id', auth, requireAdmin, workerController.updateWorker);
router.delete('/:id', auth, requireAdmin, workerController.deleteWorker);
router.patch('/:id/team', auth, requireAdmin, workerController.updateWorkerTeam);

module.exports = router;
