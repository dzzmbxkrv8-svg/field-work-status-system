const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../config/mailer');

exports.login = async (req, res, next) => {
  try {
    const { employee_id, password, role } = req.body;
    const identifier = employee_id?.trim();

    // メールアドレス（@含む）か従業員IDかを判定してどちらでもログイン可能にする
    const isEmail = identifier && identifier.includes('@');
    // 注意: employee_id は会社単位でしか一意でない(UNIQUE(company_id, employee_id))ため、
    // 同じ employee_id を持つ作業員が複数社にまたがって存在しうる。email は全社を通して
    // ユニークなので1件に絞れるが、employee_id の場合は該当しうる候補を全て取得し、
    // パスワードが一致した候補だけを本人として扱う（会社を指定させずに安全に一意化する）。
    const { rows } = await db.query(`
      SELECT u.*, t.name as team_name, c.status as company_status, c.name as company_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE ${isEmail ? 'LOWER(u.email) = LOWER($1)' : 'u.employee_id = $1'}
      ORDER BY u.id ASC
    `, [identifier]);

    let user;
    if (isEmail) {
      user = rows[0];
    } else {
      for (const candidate of rows) {
        // eslint-disable-next-line no-await-in-loop
        if (await bcrypt.compare(password || '', candidate.password_hash)) {
          user = candidate;
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: isEmail
          ? 'メールアドレスまたはパスワードが正しくありません'
          : 'IDまたはパスワードが正しくありません'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'アカウントが無効化されています' });
    }

    // 会社が運営の承認待ち・停止中の場合はログイン不可
    if (user.company_status === 'pending') {
      return res.status(401).json({
        success: false,
        message: '会社の登録申請が運営の承認待ちです。承認完了メールが届くまでお待ちください。',
        code: 'companyPending'
      });
    }
    if (user.company_status === 'suspended') {
      return res.status(401).json({
        success: false,
        message: '会社アカウントが停止されています。運営にお問い合わせください。',
        code: 'companySuspended'
      });
    }

    // 管理者承認待ちの場合はログイン不可
    if (user.status === 'pending') {
      return res.status(401).json({
        success: false,
        message: '登録申請が承認待ちです。管理者の承認をお待ちください。',
        code: 'pendingApproval'
      });
    }

    if (user.role !== role) {
      return res.status(401).json({ success: false, message: '権限が一致しません' });
    }

    // employee_id ログインは上の候補選定で既にパスワード照合済みなので、
    // ここで再照合が必要なのは email ログインの場合だけ
    const isMatch = isEmail ? await bcrypt.compare(password || '', user.password_hash) : true;
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'IDまたはパスワードが正しくありません' });
    }

    const token = jwt.sign(
      { id: user.id, employee_id: user.employee_id, role: user.role, team_id: user.team_id, team_name: user.team_name, company_id: user.company_id },
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
        team_name: user.team_name,
        company_id: user.company_id,
        company_name: user.company_name
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { access_code, name, furigana, phone, email, password } = req.body;

    // アクセスコードから所属する会社を特定
    const companyResult = await db.query(
      "SELECT id, status FROM companies WHERE access_code = $1",
      [access_code?.trim()]
    );
    const company = companyResult.rows[0];
    if (!company) {
      return res.status(400).json({ success: false, message: 'アクセスコードが正しくありません' });
    }
    if (company.status !== 'active') {
      return res.status(400).json({ success: false, message: 'この会社は現在利用できません。管理者にお問い合わせください。' });
    }

    // メールアドレスはログインIDのため全社を通して一意にする
    if (email?.trim()) {
      const dup = await db.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
        [email.trim()]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'このメールアドレスは既に登録されています' });
      }
    }

    // 作業員IDを会社内で自動採番（W001, W002 ...）
    const maxResult = await db.query(`
      SELECT COALESCE(MAX(
        CASE WHEN employee_id ~ '^W[0-9]+$'
        THEN CAST(SUBSTRING(employee_id FROM 2) AS INTEGER)
        ELSE 0 END
      ), 0) AS max_num
      FROM users
      WHERE company_id = $1
    `, [company.id]);
    const nextNum = maxResult.rows[0].max_num + 1;
    const employee_id = 'W' + String(nextNum).padStart(3, '0');

    const password_hash = await bcrypt.hash(password, 10);

    // チーム未所属・承認待ち（status = 'pending'）で登録
    const { rows } = await db.query(
      `INSERT INTO users (employee_id, name, furigana, phone, email, role, team_id, password_hash, status, company_id)
       VALUES ($1, $2, $3, $4, $5, 'worker', NULL, $6, 'pending', $7)
       RETURNING id, employee_id, name, furigana, phone, email, role, team_id, status`,
      [employee_id, name.trim(), furigana?.trim() || null, phone?.trim() || null, email?.trim() || null, password_hash, company.id]
    );

    res.status(201).json({ success: true, data: rows[0], employeeId: employee_id });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
// メールでリセット申請 → トークン発行 → メール送信
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, new_password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'メールアドレスを入力してください' });
    }

    // パスワード強度チェック
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwRegex.test(new_password)) {
      return res.status(400).json({ success: false, message: 'パスワードは大文字・小文字・数字を含む8文字以上で設定してください' });
    }

    // メールアドレスでユーザー検索
    const { rows } = await db.query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email.trim()]
    );
    if (rows.length === 0) {
      // セキュリティのため存在有無を明かさず同じメッセージを返す
      return res.status(200).json({ success: true, message: 'メールを送信しました（該当するアカウントがある場合）' });
    }
    const user = rows[0];

    // 新しいパスワードをハッシュ化して保留
    const new_pw_hash = await bcrypt.hash(new_password, 10);

    // トークン生成（32バイト = 64文字の16進数）
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    // 既存の未使用トークンを無効化してから新規作成
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [user.id]);
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, new_pw_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, token, new_pw_hash, expiresAt]
    );

    // 認証メール送信
    await sendPasswordResetEmail({ to: user.email, name: user.name, token });

    res.status(200).json({ success: true, message: '確認メールを送信しました。メールのURLをクリックしてパスワードを更新してください。' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-confirm
// トークン検証 → パスワード適用
exports.resetConfirm = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'トークンが無効です' });
    }

    const { rows } = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'リンクが無効または期限切れです。再度パスワードリセットを申請してください。', code: 'tokenExpired' });
    }

    const resetRow = rows[0];

    // パスワード更新
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [resetRow.new_pw_hash, resetRow.user_id]);

    // トークンを使用済みに
    await db.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [resetRow.id]);

    res.status(200).json({ success: true, message: 'パスワードを更新しました。新しいパスワードでログインしてください。' });
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
      SELECT u.id, u.employee_id, u.name, u.role, u.team_id, u.is_active, u.company_id,
             t.name as team_name, c.name as company_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      LEFT JOIN companies c ON u.company_id = c.id
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
        team_name: user.team_name,
        company_id: user.company_id,
        company_name: user.company_name
      }
    });
  } catch (error) {
    next(error);
  }
};
