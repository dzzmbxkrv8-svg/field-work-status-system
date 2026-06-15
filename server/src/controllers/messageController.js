const db = require('../config/db');
const { sendToUser, sendToWorkers, sendToAdmins } = require('../events/sseManager');

exports.getMessages = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await db.query(`
      SELECT m.*, u.name as sender_name FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sender_id=$1
         OR m.receiver_id=$1
         OR (m.team_id IS NOT NULL AND m.team_id = (SELECT team_id FROM users WHERE id=$1))
         OR ($2 AND m.receiver_id IS NULL AND m.team_id IS NULL AND u.company_id=$3)
      ORDER BY m.created_at ASC
    `, [req.user.id, isAdmin, req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, team_id, content, photo_url, file_url, file_name } = req.body;

    // receiver_id=null, team_id=null は作業員→管理者宛として許可
    // 管理者が両方 null で送ることは想定外なので弾く
    if (!receiver_id && !team_id && req.user.role !== 'worker') {
      return res.status(400).json({ success: false, message: '送信先(receiver_idまたはteam_id)が必要です' });
    }
    if (!content && !photo_url && !file_url) {
      return res.status(400).json({ success: false, message: 'メッセージ内容・写真・ファイルのいずれかが必要です' });
    }

    // 送信先が自社のユーザー・チームであることを確認
    if (receiver_id) {
      const check = await db.query('SELECT id FROM users WHERE id=$1 AND company_id=$2', [receiver_id, req.user.company_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ success: false, message: '送信先のユーザーが見つかりません' });
      }
    }
    if (team_id) {
      const check = await db.query('SELECT id FROM teams WHERE id=$1 AND company_id=$2', [team_id, req.user.company_id]);
      if (check.rows.length === 0) {
        return res.status(400).json({ success: false, message: '送信先のチームが見つかりません' });
      }
    }

    const { rows } = await db.query(`
      INSERT INTO messages (sender_id, receiver_id, team_id, content, photo_url, file_url, file_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      req.user.id,
      receiver_id || null,
      team_id || null,
      content || '',
      photo_url || null,
      file_url || null,
      file_name || null,
    ]);
    const msg = rows[0]

    // SSE でリアルタイム通知
    if (msg.receiver_id) {
      // 特定ユーザーへ直接メッセージ
      sendToUser(msg.receiver_id, 'new_message', { senderId: msg.sender_id })
      // 送信者が作業員なら管理者にも通知
      if (req.user.role === 'worker') {
        sendToAdmins('new_message', { senderId: msg.sender_id }, req.user.company_id)
      }
    } else if (msg.team_id) {
      // チーム全員へのブロードキャスト → 作業員全員に通知
      sendToWorkers('new_message', { teamId: msg.team_id }, req.user.company_id)
    } else {
      // receiver_id=null, team_id=null の場合
      // 管理者からの送信 → 全作業員へブロードキャスト
      // 作業員からの送信 → 管理者への連絡
      if (req.user.role === 'admin') {
        sendToWorkers('new_message', { senderId: msg.sender_id }, req.user.company_id)
      } else {
        sendToAdmins('new_message', { senderId: msg.sender_id }, req.user.company_id)
      }
    }

    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await db.query(
      `UPDATE messages SET is_read=true
       WHERE id=$1 AND (
         receiver_id=$2
         OR (receiver_id IS NULL AND team_id IS NULL AND $3)
         OR (receiver_id IS NULL AND team_id IS NOT NULL AND NOT $3)
       ) RETURNING *`,
      [req.params.id, req.user.id, isAdmin]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
