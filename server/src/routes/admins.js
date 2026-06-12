const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const adminController = require('../controllers/adminController');

// 招待の承諾（メールリンクから・公開）
router.post('/accept', adminController.acceptInvite);

// 以下は管理者のみ
router.get('/', auth, requireAdmin, adminController.getAdmins);
router.post('/invite', auth, requireAdmin, adminController.inviteAdmin);
router.delete('/invitations/:id', auth, requireAdmin, adminController.cancelInvitation);
router.delete('/:id', auth, requireAdmin, adminController.deactivateAdmin);

module.exports = router;
