const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendAdminInviteEmail } = require('../config/mailer');

// GET /api/admins — 自社の管理者一覧+未承諾の招待一覧
exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await db.query(`
      SELECT id, employee_id, name, furigana, email, created_at
      FROM users
      WHERE role = 'admin' AND is_active = true AND company_id = $1
      ORDER BY created_at ASC
    `, [req.user.company_id]);

    const invitations = await db.query(`
      SELECT i.id, i.email, i.name, i.expires_at, i.created_at, u.name AS invited_by_name
      FROM admin_invitations i
      LEFT JOIN users u ON i.invited_by = u.id
      WHERE i.company_id = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()
      ORDER BY i.created_at DESC
    `, [req.user.company_id]);

    res.status(200).json({
      success: true,
      data: admins.rows,
      invitations: invitations.rows,
      total: admins.rows.length,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admins/invite — 管理者を招待（メール送信）
exports.inviteAdmin = async (req, res, next) => {
  try {
    const { name, furigana, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '氏名を入力してください' });
    }
    const emailTrimmed = email?.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ success: false, message: '有効なメールアドレスを入力してください' });
    }

    // メールアドレスはログインIDのため全社を通して一意にする
    const dup = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [emailTrimmed]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'このメールアドレスは既に登録されています' });
    }

    // 同じ宛先への未承諾の招待は無効化して再発行する
    await db.query(
      'DELETE FROM admin_invitations WHERE company_id = $1 AND LOWER(email) = LOWER($2) AND accepted_at IS NULL',
      [req.user.company_id, emailTrimmed]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72時間

    await db.query(
      `INSERT INTO admin_invitations (company_id, email, name, furigana, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.company_id, emailTrimmed, name.trim(), furigana?.trim() || null, token, req.user.id, expiresAt]
    );

    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [req.user.company_id]);
    const inviterResult = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}?admin_invite=${token}`;
    await sendAdminInviteEmail({
      to: emailTrimmed,
      name: name.trim(),
      companyName: companyResult.rows[0]?.name ?? '',
      inviterName: inviterResult.rows[0]?.name ?? '管理者',
      inviteUrl,
    });

    res.status(201).json({ success: true, message: `${emailTrimmed} に招待メールを送信しました。` });
  } catch (err) {
    next(err);
  }
};

// POST /api/admins/accept — 招待リンクからパスワードを設定して管理者アカウントを有効化（公開）
exports.acceptInvite = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'トークンが無効です', code: 'tokenExpired' });
    }
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwRegex.test(password || '')) {
      return res.status(400).json({ success: false, message: 'パスワードは大文字・小文字・数字を含む8文字以上で設定してください' });
    }

    const { rows } = await db.query(
      `SELECT * FROM admin_invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: '招待リンクが無効または期限切れです。管理者に再招待を依頼してください。', code: 'tokenExpired' });
    }
    const invite = rows[0];

    // 招待後に同じメールアドレスが登録された場合に備えて再チェック
    const dup = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [invite.email]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'このメールアドレスは既に登録されています' });
    }

    // 管理者IDを会社内で自動採番（A001, A002 ...）
    const maxResult = await db.query(`
      SELECT COALESCE(MAX(
        CASE WHEN employee_id ~ '^A[0-9]+$'
        THEN CAST(SUBSTRING(employee_id FROM 2) AS INTEGER)
        ELSE 0 END
      ), 0) AS max_num
      FROM users
      WHERE company_id = $1
    `, [invite.company_id]);
    const employee_id = 'A' + String(maxResult.rows[0].max_num + 1).padStart(3, '0');

    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO users (employee_id, name, furigana, email, role, password_hash, status, company_id)
       VALUES ($1, $2, $3, $4, 'admin', $5, 'active', $6)`,
      [employee_id, invite.name, invite.furigana, invite.email, password_hash, invite.company_id]
    );
    await db.query('UPDATE admin_invitations SET accepted_at = NOW() WHERE id = $1', [invite.id]);

    res.status(201).json({ success: true, message: '管理者アカウントを作成しました。メールアドレスとパスワードでログインしてください。' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admins/invitations/:id — 未承諾の招待を取り消す
exports.cancelInvitation = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM admin_invitations WHERE id = $1 AND company_id = $2 AND accepted_at IS NULL',
      [req.params.id, req.user.company_id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: '招待が見つかりません' });
    }
    res.status(200).json({ success: true, message: '招待を取り消しました' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admins/:id — 管理者を無効化
exports.deactivateAdmin = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id) {
      return res.status(400).json({ success: false, message: '自分自身は削除できません' });
    }

    // 最後の1人の管理者は削除不可
    const countResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND is_active = true AND company_id = $1`,
      [req.user.company_id]
    );
    if (Number(countResult.rows[0].cnt) <= 1) {
      return res.status(400).json({ success: false, message: '最後の管理者は削除できません' });
    }

    const { rows } = await db.query(
      `UPDATE users SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND role = 'admin' AND is_active = true AND company_id = $2
       RETURNING id, name`,
      [targetId, req.user.company_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '管理者が見つかりません' });
    }
    res.status(200).json({ success: true, message: `${rows[0].name} さんの管理者アカウントを無効化しました` });
  } catch (err) {
    next(err);
  }
};
