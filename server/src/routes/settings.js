const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const { getAnnouncement, updateAnnouncement, getAccessCode } = require('../controllers/settingsController');

// お知らせ
router.get('/announcement', auth, getAnnouncement);
router.put('/announcement', auth, requireAdmin, updateAnnouncement);

// 会社アクセスコード（管理者のみ・Fieldo運営発行のため読み取り専用）
router.get('/access-code', auth, requireAdmin, getAccessCode);

module.exports = router;
