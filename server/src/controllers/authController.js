const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { employee_id, password, role } = req.body;

    const { rows } = await db.query(`
      SELECT u.*, t.name as team_name 
      FROM users u 
      LEFT JOIN teams t ON u.team_id = t.id 
      WHERE u.employee_id = $1
    `, [employee_id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'IDまたはパスワードが正しくありません' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'アカウントが無効化されています' });
    }

    if (user.role !== role) {
      return res.status(401).json({ success: false, message: '権限が一致しません' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'IDまたはパスワードが正しくありません' });
    }

    const token = jwt.sign(
      { id: user.id, employee_id: user.employee_id, role: user.role, team_id: user.team_id, team_name: user.team_name },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        role: user.role,
        team_id: user.team_id,
        team_name: user.team_name
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'ログアウトしました' });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.employee_id, u.name, u.role, u.team_id, u.is_active, t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.id = $1
    `, [req.user.id]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'ユーザーが見つかりません' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'アカウントが無効化されています' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        role: user.role,
        team_id: user.team_id,
        team_name: user.team_name
      }
    });
  } catch (error) {
    next(error);
  }
};
