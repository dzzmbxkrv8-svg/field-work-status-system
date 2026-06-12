const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// 会社登録申請（公開エンドポイント）
router.post('/register', companyController.registerCompany);

// 運営承認リンク（メール内URLからブラウザで開く）
router.get('/approve', companyController.approveCompany);

module.exports = router;
