const nodemailer = require('nodemailer');

// Resend (HTTP API) - Railwayなどクラウド環境向け
// RESEND_API_KEY が設定されている場合はResendを使用
// 未設定の場合はnodemailer(SMTP)にフォールバック

let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
}

const smtpTransporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.RESEND_FROM
  || process.env.SMTP_FROM
  || `Fieldo <${process.env.SMTP_USER}>`;

/** メール共通レイアウト */
function wrapHtml(title, bodyHtml) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f5f5fa;border-radius:16px;">
      <p style="font-size:0.75rem;font-weight:700;color:#4f46e5;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 16px;">FIELDO</p>
      <h2 style="margin:0 0 8px;font-size:1.35rem;color:#0f0e2e;">${title}</h2>
      ${bodyHtml}
    </div>
  `;
}

/** メール送信（Resend優先 → SMTP → コンソール） */
async function sendOrLog({ to, subject, html, devNote }) {
  if (resendClient) {
    await resendClient.emails.send({ from: FROM, to, subject, html });
    return { success: true };
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    await smtpTransporter.sendMail({ from: FROM, to, subject, html });
    return { success: true };
  }
  // 開発用: コンソール出力
  console.log(`\n📧 [DEV] ${subject}:`);
  console.log(`  To: ${to}`);
  if (devNote) console.log(`  ${devNote}\n`);
  return { success: true, dev: true };
}

async function sendPasswordResetEmail({ to, name, token }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}?reset_token=${token}`;
  const html = wrapHtml('パスワード再設定のご確認', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 24px;">
      ${name} さん、<br>
      以下のボタンをクリックするとパスワードが更新されます。<br>
      このメールに心当たりがない場合は無視してください。
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;background:#1e1b4b;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem;">
      パスワードを更新する
    </a>
    <p style="color:#94a3b8;font-size:0.78rem;margin:24px 0 0;">
      このリンクは1時間後に無効になります。<br>
      URL: <a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a>
    </p>
  `);
  return sendOrLog({ to, subject: '【Fieldo】パスワード再設定のご確認', html, devNote: `Reset URL: ${resetUrl}` });
}

async function sendOperatorApprovalEmail({ companyName, adminName, email, phone, approveUrl }) {
  const operatorEmail = process.env.OPERATOR_EMAIL || process.env.SMTP_USER || 'operator@fieldo.local';
  const html = wrapHtml('新しい会社登録の申請', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 16px;">以下の会社から登録申請がありました。内容を確認のうえ承認してください。</p>
    <table style="width:100%;font-size:0.9rem;color:#0f0e2e;border-collapse:collapse;margin:0 0 24px;">
      <tr><td style="padding:6px 0;color:#64748b;width:96px;">会社名</td><td>${companyName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">管理者名</td><td>${adminName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">メール</td><td>${email}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">電話番号</td><td>${phone || '未入力'}</td></tr>
    </table>
    <a href="${approveUrl}"
       style="display:inline-block;background:#1e1b4b;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem;">
      この会社を承認する
    </a>
    <p style="color:#94a3b8;font-size:0.78rem;margin:24px 0 0;">
      URL: <a href="${approveUrl}" style="color:#4f46e5;">${approveUrl}</a>
    </p>
  `);
  return sendOrLog({
    to: operatorEmail,
    subject: `【Fieldo運営】会社登録申請: ${companyName}`,
    html,
    devNote: `Approve URL: ${approveUrl}`,
  });
}

async function sendCompanyReceivedEmail({ to, name, companyName }) {
  const html = wrapHtml('登録申請を受け付けました', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 16px;">
      ${name} さん、<br>
      「${companyName}」の登録申請を受け付けました。<br>
      Fieldo運営による確認・承認が完了すると、アクセスコードとログインのご案内をメールでお送りします。
    </p>
    <p style="color:#94a3b8;font-size:0.78rem;margin:0;">
      通常1〜2営業日以内にご連絡します。このメールに心当たりがない場合は無視してください。
    </p>
  `);
  return sendOrLog({ to, subject: '【Fieldo】会社登録申請を受け付けました', html });
}

async function sendCompanyApprovedEmail({ to, name, companyName, accessCode }) {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = wrapHtml('登録が承認されました', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 16px;">
      ${name} さん、<br>
      「${companyName}」の登録が承認されました。以下のメールアドレスとご登録のパスワードで管理者としてログインできます。
    </p>
    <p style="color:#475569;font-size:0.9rem;margin:0 0 8px;">貴社のアクセスコード（作業員のアカウント作成時に必要です）:</p>
    <p style="font-size:1.4rem;font-weight:700;color:#1e1b4b;letter-spacing:0.08em;background:#fff;
              border-radius:10px;padding:14px 20px;margin:0 0 24px;text-align:center;">
      ${accessCode}
    </p>
    <a href="${loginUrl}"
       style="display:inline-block;background:#1e1b4b;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem;">
      ログインする
    </a>
    <p style="color:#94a3b8;font-size:0.78rem;margin:24px 0 0;">
      アクセスコードは管理者画面のダッシュボードでも確認できます。
    </p>
  `);
  return sendOrLog({
    to,
    subject: '【Fieldo】会社登録が承認されました',
    html,
    devNote: `Access code: ${accessCode}`,
  });
}

async function sendAdminInviteEmail({ to, name, companyName, inviterName, inviteUrl }) {
  const html = wrapHtml('管理者として招待されました', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 16px;">
      ${name} さん、<br>
      ${inviterName} さんから「${companyName}」の管理者として招待されました。<br>
      以下のボタンからパスワードを設定すると、管理者としてログインできるようになります。
    </p>
    <a href="${inviteUrl}"
       style="display:inline-block;background:#1e1b4b;color:#fff;text-decoration:none;
              padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem;">
      パスワードを設定して参加する
    </a>
    <p style="color:#94a3b8;font-size:0.78rem;margin:24px 0 0;">
      このリンクは72時間後に無効になります。心当たりがない場合は無視してください。<br>
      URL: <a href="${inviteUrl}" style="color:#4f46e5;">${inviteUrl}</a>
    </p>
  `);
  return sendOrLog({
    to,
    subject: `【Fieldo】${companyName} の管理者として招待されました`,
    html,
    devNote: `Invite URL: ${inviteUrl}`,
  });
}

async function sendErrorAlertEmail({ message, path, method, count }) {
  const operatorEmail = process.env.OPERATOR_EMAIL || process.env.SMTP_USER || 'operator@fieldo.local';
  const html = wrapHtml('サーバーエラーが発生しています', `
    <p style="color:#475569;font-size:0.9rem;margin:0 0 16px;">
      本番環境でサーバーエラー(5xx)が発生しました。内容を確認してください。
    </p>
    <table style="width:100%;font-size:0.85rem;color:#0f0e2e;border-collapse:collapse;margin:0 0 16px;">
      <tr><td style="padding:6px 0;color:#64748b;width:100px;">リクエスト</td><td>${method} ${path}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">エラー内容</td><td style="word-break:break-all;">${message}</td></tr>
      ${count > 1 ? `<tr><td style="padding:6px 0;color:#64748b;">直近の発生回数</td><td>${count}件（クールダウン期間中に抑制）</td></tr>` : ''}
    </table>
    <p style="color:#94a3b8;font-size:0.78rem;margin:0;">
      詳細はRenderのログをご確認ください。同様のアラートは一定時間抑制されます。
    </p>
  `);
  return sendOrLog({
    to: operatorEmail,
    subject: `【Fieldo】サーバーエラー通知: ${method} ${path}`,
    html,
    devNote: `Error: ${message}`,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendOperatorApprovalEmail,
  sendCompanyReceivedEmail,
  sendCompanyApprovedEmail,
  sendAdminInviteEmail,
  sendErrorAlertEmail,
};
