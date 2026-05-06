const db = require('../config/db');

exports.getMessages = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT m.*, u.name as sender_name FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.sender_id=$1
         OR m.receiver_id=$1
         OR (m.team_id IS NOT NULL AND m.team_id = (SELECT team_id FROM users WHERE id=$1))
      ORDER BY m.created_at ASC
    `, [req.user.id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, team_id, content, photo_url, file_url, file_name } = req.body;

    if (!receiver_id && !team_id) {
      return res.status(400).json({ success: false, message: '送信先(receiver_idまたはteam_id)が必要です' });
    }
    if (!content && !photo_url && !file_url) {
      return res.status(400).json({ success: false, message: 'メッセージ内容・写真・ファイルのいずれかが必要です' });
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
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'UPDATE messages SET is_read=true WHERE id=$1 AND receiver_id=$2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
