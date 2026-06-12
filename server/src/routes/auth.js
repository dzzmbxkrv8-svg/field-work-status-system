const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

const validateLogin = [
  body('employee_id').notEmpty().withMessage('employee_idは必須です').isString().withMessage('employee_idは文字列である必要があります'),
  body('password').notEmpty().withMessage('passwordは必須です').isLength({ min: 6 }).withMessage('passwordは6文字以上である必要があります'),
  body('role').notEmpty().withMessage('roleは必須です').isIn(['worker', 'admin']).withMessage("roleは'worker'または'admin'である必要があります"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

const validateRegister = [
  body('access_code').notEmpty().withMessage('アクセスコードは必須です'),
  body('name').notEmpty().isString().withMessage('氏名は必須です'),
  body('password')
    .isLength({ min: 8 }).withMessage('パスワードは8文字以上で入力してください')
    .matches(/[a-z]/).withMessage('パスワードに小文字を含めてください')
    .matches(/[A-Z]/).withMessage('パスワードに大文字を含めてください')
    .matches(/[0-9]/).withMessage('パスワードに数字を含めてください'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  }
];

const validateResetPassword = [
  body('employee_id').notEmpty().isString().withMessage('社員IDは必須です'),
  body('name').notEmpty().isString().withMessage('氏名は必須です'),
  body('new_password').isLength({ min: 6 }).withMessage('パスワードは6文字以上で入力してください'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
  }
];

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.post('/forgot-password', authController.forgotPassword);   // 新フロー: メール送信
router.post('/reset-confirm', authController.resetConfirm);        // 新フロー: トークン確認
router.post('/reset-password', validateResetPassword, authController.resetPassword); // 旧互換
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);

// WebAuthn（生体認証）
const wc = require('../controllers/webauthnController');
router.post('/webauthn/register-start',  auth, wc.registerStart);
router.post('/webauthn/register-finish', auth, wc.registerFinish);
router.post('/webauthn/login-start',  wc.loginStart);
router.post('/webauthn/login-finish', wc.loginFinish);
router.get('/webauthn/status', auth, wc.status);

module.exports = router;
