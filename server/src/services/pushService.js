// Web Push通知の送信サービス。
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY が未設定の場合は何もせず終了する
// （Push通知は既存のSSE通知に相乗りする追加機能であり、必須ではないため）。

const webpush = require('web-push');
const db = require('../config/db');

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@fieldo.app';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

// イベント種別ごとの通知タイトル・本文を組み立てる（SSEのdataと同じ情報を流用）
function buildNotification(event, data) {
  switch (event) {
    case 'new_assignment':
      return { title: '新しい作業指示', body: data.title ? `「${data.title}」が届きました` : '新しい作業指示が届きました' };
    case 'assignment_updated':
      return { title: '作業指示が更新されました', body: data.title ? `「${data.title}」` : '担当中の案件が更新されました' };
    case 'assignment_status_changed':
      return { title: '案件のステータスが変わりました', body: data.title ? `「${data.title}」` : '案件のステータスが更新されました' };
    case 'attendance_status_changed':
      return { title: '出退勤ステータスの報告', body: data.workerName ? `${data.workerName}さんから報告がありました` : '作業員から出退勤の報告がありました' };
    case 'new_message':
      return { title: '新着メッセージ', body: 'メッセージが届いています' };
    case 'announcement_updated':
      return { title: 'お知らせが更新されました', body: data.value ? String(data.value).slice(0, 60) : '新しいお知らせがあります' };
    default:
      return { title: 'Fieldo', body: '新しい通知があります' };
  }
}

async function sendToSubscriptions(subscriptions, payload) {
  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      // 410/404は購読が失効している（ブラウザ側で解除済み等）ため、DBからも削除する
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.query('DELETE FROM push_subscriptions WHERE id=$1', [sub.id]).catch(() => {});
      } else {
        console.warn('[pushService] 送信に失敗しました:', err.message);
      }
    }
  }));
}

async function sendPushToUser(userId, event, data) {
  if (!ensureConfigured()) return;
  try {
    const { rows } = await db.query('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1', [userId]);
    if (rows.length === 0) return;
    await sendToSubscriptions(rows, buildNotification(event, data));
  } catch (err) {
    console.warn('[pushService] sendPushToUser失敗:', err.message);
  }
}

async function sendPushToRole(companyId, role, event, data) {
  if (!ensureConfigured()) return;
  try {
    const { rows } = await db.query(`
      SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.company_id = $1 AND u.role = $2 AND u.is_active = true
    `, [companyId, role]);
    if (rows.length === 0) return;
    await sendToSubscriptions(rows, buildNotification(event, data));
  } catch (err) {
    console.warn('[pushService] sendPushToRole失敗:', err.message);
  }
}

module.exports = { sendPushToUser, sendPushToRole };
