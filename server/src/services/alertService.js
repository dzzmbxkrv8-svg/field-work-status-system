// サーバーエラー(5xx)発生時に運営者へメールアラートを送るサービス。
// 同じエラーが短時間に大量発生してもメールが殺到しないよう、
// クールダウン期間中は送信をスキップしてカウントだけ積み上げる。

const { sendErrorAlertEmail } = require('../config/mailer');

const COOLDOWN_MS = 5 * 60 * 1000; // 5分に1通まで
let lastSentAt = 0;
let suppressedCount = 0;

async function notifyServerError({ message, path, method }) {
  const now = Date.now();
  if (now - lastSentAt < COOLDOWN_MS) {
    suppressedCount += 1;
    return;
  }
  const count = suppressedCount + 1;
  lastSentAt = now;
  suppressedCount = 0;
  try {
    await sendErrorAlertEmail({ message, path, method, count });
  } catch (err) {
    console.warn('[alertService] アラートメールの送信に失敗しました:', err.message);
  }
}

module.exports = { notifyServerError };
