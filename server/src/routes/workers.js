const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const workerController = require('../controllers/workerController');

// 一覧取得は作業員も可（メッセージ送信先の選択に使うため）。個人情報の絞り込みはcontroller側で行う
router.get('/', auth, workerController.getWorkers);
router.post('/', auth, requireAdmin, workerController.createWorker);
// 承認待ち一覧・承認（/:id より先に定義）
router.get('/pending', auth, requireAdmin, workerController.getPendingWorkers);
router.patch('/:id/approve', auth, requireAdmin, workerController.approveWorker);
// AIおまかせ（距離・負荷・スキルバランスを考慮した候補提案）
router.post('/recommend', auth, requireAdmin, workerController.recommendWorkers);
// 作業員本人によるプロフィール自己編集（/:id より先に定義）
router.get('/me', auth, workerController.getMyProfile);
router.put('/me', auth, workerController.updateMyProfile);
router.get('/:id', auth, workerController.getWorker);
router.put('/:id', auth, requireAdmin, workerController.updateWorker);
router.delete('/:id', auth, requireAdmin, workerController.deleteWorker);
router.patch('/:id/team', auth, requireAdmin, workerController.updateWorkerTeam);

module.exports = router;
