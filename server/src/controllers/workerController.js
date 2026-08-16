const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendToAdmins } = require('../events/sseManager');

exports.getWorkers = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // 作業員同士のメッセージ送信先一覧としても使われるため作業員にも公開するが、
    // 電話番号・メールアドレスなど個人情報は管理者にのみ返す
    const { rows } = await db.query(`
      SELECT u.id, u.employee_id, u.name, u.furigana,
             ${isAdmin ? 'u.phone, u.email, u.status,' : ''}
             u.team_id, t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.role = 'worker' AND u.is_active = true AND u.company_id = $1
        ${isAdmin ? '' : "AND u.status = 'active'"}
      ORDER BY ${isAdmin ? 'u.status DESC, ' : ''}u.created_at DESC
    `, [req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

exports.updateWorkerTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET team_id = $1 WHERE id = $2 AND role = 'worker' AND is_active = true AND company_id = $3
       RETURNING id, name, employee_id, team_id`,
      [teamId || null, id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && parseInt(id, 10) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'アクセス権がありません' });
    }
    const { rows } = await db.query(
      "SELECT id, employee_id, name, furigana, role, team_id FROM users WHERE id=$1 AND role='worker' AND is_active=true AND company_id=$2",
      [id, req.user.company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.createWorker = async (req, res, next) => {
  try {
    const { employee_id, name, furigana, password, team_id } = req.body;
    if (!employee_id || !employee_id.trim()) {
      return res.status(400).json({ success: false, message: '社員IDは必須です' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'パスワードは6文字以上で入力してください' });
    }
    const existing = await db.query(
      'SELECT id FROM users WHERE employee_id=$1 AND company_id=$2',
      [employee_id.trim(), req.user.company_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'この社員IDはすでに使用されています' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, name, furigana, role, team_id, password_hash, company_id)
       VALUES ($1, $2, $3, 'worker', $4, $5, $6)
       RETURNING id, employee_id, name, furigana, role, team_id`,
      [employee_id.trim(), name.trim(), furigana?.trim() || null, team_id || null, password_hash, req.user.company_id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, furigana, phone, email, team_id, password } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名は必須です' });
    }
    let password_hash;
    if (password) {
      const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!pwRegex.test(password)) {
        return res.status(400).json({ success: false, message: 'パスワードは大文字・小文字・数字を含む8文字以上で入力してください' });
      }
      password_hash = await bcrypt.hash(password, 10);
    }
    const base = `name=$1, furigana=$2, phone=$3, email=$4, team_id=$5, updated_at=NOW()`;
    const updateQuery = password_hash
      ? `UPDATE users SET ${base}, password_hash=$6 WHERE id=$7 AND role='worker' AND is_active=true AND company_id=$8
         RETURNING id, employee_id, name, furigana, phone, email, role, team_id`
      : `UPDATE users SET ${base} WHERE id=$6 AND role='worker' AND is_active=true AND company_id=$7
         RETURNING id, employee_id, name, furigana, phone, email, role, team_id`;
    const params = password_hash
      ? [name.trim(), furigana?.trim()||null, phone?.trim()||null, email?.trim()||null, team_id||null, password_hash, id, req.user.company_id]
      : [name.trim(), furigana?.trim()||null, phone?.trim()||null, email?.trim()||null, team_id||null, id, req.user.company_id];
    const { rows } = await db.query(updateQuery, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE users SET is_active=false, updated_at=NOW()
       WHERE id=$1 AND role='worker' AND is_active=true AND company_id=$2 RETURNING id`,
      [id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '作業員が見つかりません' });
    }
    res.status(200).json({ success: true, message: '作業員を無効化しました' });
  } catch (err) {
    next(err);
  }
};

// 承認待ち作業員の一覧取得
exports.getPendingWorkers = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id, employee_id, name, furigana, phone, email, created_at
      FROM users
      WHERE role = 'worker' AND is_active = true AND status = 'pending' AND company_id = $1
      ORDER BY created_at DESC
    `, [req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// 作業員を承認（pending → active）
exports.approveWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `UPDATE users SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND role = 'worker' AND status = 'pending' AND company_id = $2
       RETURNING id, employee_id, name, status`,
      [id, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '対象の作業員が見つかりません' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};
