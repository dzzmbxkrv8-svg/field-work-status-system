const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '認証トークンが必要です' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
    
    // DBからユーザーの存在確認もする（is_active: trueのみ許可）
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: '無効なユーザーです' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'アカウントが無効化されています' });
    }

    // 会社ID・チームID・名前はDBの最新値を使う（マイグレーション前の古いトークンにも対応）
    req.user = { ...decoded, company_id: user.company_id, team_id: user.team_id, name: user.name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'トークンの有効期限が切れています' });
    }
    return res.status(401).json({ success: false, message: '無効な認証トークンです' });
  }
};

module.exports = auth;
