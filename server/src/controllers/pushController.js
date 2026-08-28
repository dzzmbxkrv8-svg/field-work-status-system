const db = require('../config/db');

// フロントエンドが購読(subscribe)する際に使う公開鍵を返す。
// VAPID_PUBLIC_KEYは秘密鍵ではなく公開鍵なので認証なしで返してよい。
exports.getVapidPublicKey = (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null;
  res.status(200).json({ success: true, data: { publicKey } });
};

exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: '購読情報が不正です' });
    }
    await db.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
    `, [req.user.id, endpoint, keys.p256dh, keys.auth]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpointは必須です' });
    }
    await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2', [endpoint, req.user.id]);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
