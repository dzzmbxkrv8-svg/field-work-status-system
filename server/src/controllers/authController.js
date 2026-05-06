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

exports.register = async (req, res, next) => {
  try {
    const { access_code, employee_id, name, password } = req.body;

    const team = await db.query('SELECT id, name FROM teams WHERE access_code = $1', [access_code]);
    if (team.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'アクセスコードが正しくありません' });
    }

    const existing = await db.query('SELECT id FROM users WHERE employee_id = $1', [employee_id.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'この社員IDはすでに使用されています' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, name, role, team_id, password_hash)
       VALUES ($1, $2, 'worker', $3, $4)
       RETURNING id, employee_id, name, role, team_id`,
      [employee_id.trim(), name.trim(), team.rows[0].id, password_hash]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { employee_id, name, new_password } = req.body;

    const { rows } = await db.query(
      `SELECT id FROM users WHERE employee_id = $1 AND name = $2 AND is_active = true`,
      [employee_id.trim(), name.trim()]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '社員IDまたは氏名が正しくありません' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, rows[0].id]);

    res.status(200).json({ success: true, message: 'パスワードを変更しました' });
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
