const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/role');
const { getAnnouncement, updateAnnouncement, getAccessCode, getPlan } = require('../controllers/settingsController');

// お知らせ
router.get('/announcement', auth, getAnnouncement);
router.put('/announcement', auth, requireAdmin, updateAnnouncement);

// 会社アクセスコード（管理者のみ・Fieldo運営発行のため読み取り専用）
router.get('/access-code', auth, requireAdmin, getAccessCode);

// 契約プラン（管理者のみ・閲覧専用。変更はFieldo運営が手動で行う）
router.get('/plan', auth, requireAdmin, getPlan);

module.exports = router;
