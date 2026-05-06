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
  body('employee_id').notEmpty().isString().withMessage('社員IDは必須です'),
  body('name').notEmpty().isString().withMessage('氏名は必須です'),
  body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上で入力してください'),
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
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.me);

module.exports = router;
