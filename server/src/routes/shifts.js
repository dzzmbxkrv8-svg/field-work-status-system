const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const shiftsController = require('../controllers/shiftsController');

router.post('/', auth, requireAdmin, shiftsController.createShiftRequest);
router.get('/', auth, requireAdmin, shiftsController.getShifts);
// /:id より先に定義（workers.js の /pending と同様のパターン）
router.get('/worker/my', auth, shiftsController.getMyShifts);
router.get('/availability', auth, requireAdmin, shiftsController.getAvailableWorkers);
router.get('/:id', auth, shiftsController.getShiftById);
router.delete('/:id', auth, requireAdmin, shiftsController.deleteShiftRequest);
router.get('/:id/summary', auth, requireAdmin, shiftsController.getShiftSummary);
router.post('/:id/respond', auth, shiftsController.respondToShift);
router.post('/:id/confirm', auth, requireAdmin, shiftsController.confirmShiftDate);
router.post('/:id/confirm-all', auth, requireAdmin, shiftsController.confirmAllDates);
router.post('/:id/resend', auth, requireAdmin, shiftsController.resendShiftRequest);

module.exports = router;
