const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  sendOperatorApprovalEmail,
  sendCompanyReceivedEmail,
  sendCompanyApprovedEmail,
} = require('../config/mailer');

// 紛らわしい文字(0/O, 1/I)を除いた文字セットでアクセスコードを生成する
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeBlock(length) {
  let block = '';
  for (let i = 0; i < length; i++) {
    block += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return block;
}

// FLD-XXXX-XXXX 形式の一意なアクセスコードを発行する
async function generateUniqueAccessCode(client) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `FLD-${randomCodeBlock(4)}-${randomCodeBlock(4)}`;
    const { rows } = await client.query('SELECT id FROM companies WHERE access_code = $1', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('アクセスコードの発行に失敗しました');
}

// POST /api/companies/register
// 会社+管理者アカウントを承認待ちで作成し、運営に承認依頼メールを送る
exports.registerCompany = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { company_name, admin_name, furigana, phone, email, password } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ success: false, message: '会社名を入力してください' });
    }
    if (!admin_name || !admin_name.trim()) {
      return res.status(400).json({ success: false, message: '管理者の氏名を入力してください' });
    }
    const emailTrimmed = email?.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ success: false, message: '有効なメールアドレスを入力してください' });
    }
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwRegex.test(password || '')) {
      return res.status(400).json({ success: false, message: 'パスワードは大文字・小文字・数字を含む8文字以上で設定してください' });
    }

    // メールアドレスはログインIDのため全社を通して一意にする
    const dup = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [emailTrimmed]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'このメールアドレスは既に登録されています' });
    }

    await client.query('BEGIN');

    const accessCode = await generateUniqueAccessCode(client);
    const approvalToken = crypto.randomBytes(32).toString('hex');

    const companyResult = await client.query(
      `INSERT INTO companies (name, access_code, status, approval_token)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id, name, access_code`,
      [company_name.trim(), accessCode, approvalToken]
    );
    const company = companyResult.rows[0];

    // 管理者アカウント本人は active、会社が pending の間はログイン不可
    const password_hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO users (employee_id, name, furigana, phone, email, role, password_hash, status, company_id)
       VALUES ('A001', $1, $2, $3, $4, 'admin', $5, 'active', $6)`,
      [admin_name.trim(), furigana?.trim() || null, phone?.trim() || null, emailTrimmed, password_hash, company.id]
    );

    await client.query('COMMIT');

    const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
    const approveUrl = `${serverUrl}/api/companies/approve?token=${approvalToken}`;
    await sendOperatorApprovalEmail({
      companyName: company.name,
      adminName: admin_name.trim(),
      email: emailTrimmed,
      phone: phone?.trim(),
      approveUrl,
    });
    await sendCompanyReceivedEmail({ to: emailTrimmed, name: admin_name.trim(), companyName: company.name });

    res.status(201).json({
      success: true,
      message: '登録申請を受け付けました。運営の承認後、アクセスコードとログインのご案内をメールでお送りします。',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

// GET /api/companies/approve?token=...
// 運営がメール内リンクから会社を承認する（ブラウザで開くためHTMLを返す）
exports.approveCompany = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(approvalPage('リンクが無効です', 'トークンが見つかりません。メール内のURLをそのまま開いてください。', false));
    }

    const { rows } = await db.query(
      'SELECT id, name, access_code, status FROM companies WHERE approval_token = $1',
      [token]
    );
    if (rows.length === 0) {
      return res.status(404).send(approvalPage('リンクが無効です', 'この承認リンクは存在しないか、すでに無効化されています。', false));
    }
    const company = rows[0];

    if (company.status === 'active') {
      return res.status(200).send(approvalPage('承認済みです', `「${company.name}」はすでに承認されています。`, true));
    }

    await db.query(
      `UPDATE companies SET status = 'active', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [company.id]
    );

    // 会社の管理者へ承認完了メール（アクセスコード記載）
    const adminResult = await db.query(
      `SELECT name, email FROM users WHERE company_id = $1 AND role = 'admin' ORDER BY id ASC LIMIT 1`,
      [company.id]
    );
    const admin = adminResult.rows[0];
    if (admin?.email) {
      await sendCompanyApprovedEmail({
        to: admin.email,
        name: admin.name,
        companyName: company.name,
        accessCode: company.access_code,
      });
    }

    res.status(200).send(approvalPage(
      '承認が完了しました',
      `「${company.name}」を承認しました。管理者（${admin?.name ?? '-'}）にアクセスコードを記載したメールを送信しました。`,
      true
    ));
  } catch (error) {
    next(error);
  }
};

// 承認結果をブラウザに表示するシンプルなHTMLページ
function approvalPage(title, message, ok) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Fieldo</title>
</head>
<body style="margin:0;background:#f5f5fa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 8px 24px rgba(15,14,46,0.08);">
    <p style="font-size:0.75rem;font-weight:700;color:#4f46e5;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px;">FIELDO</p>
    <p style="font-size:2.2rem;margin:0 0 8px;">${ok ? '✓' : '✕'}</p>
    <h1 style="font-size:1.25rem;color:#0f0e2e;margin:0 0 12px;">${title}</h1>
    <p style="font-size:0.9rem;color:#475569;margin:0;line-height:1.7;">${message}</p>
  </div>
</body>
</html>`;
}
