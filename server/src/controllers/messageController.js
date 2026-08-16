const db = require('../config/db');
const { sendToUser, sendToWorkers, sendToAdmins } = require('../events/sseManager');

exports.getMessages = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await db.query(`
      SELECT m.*, u.name as sender_name,
             sr.title as shift_title, sr.period_start as shift_period_start,
             sr.period_end as shift_period_end, sr.deadline as shift_deadline,
             sr.status as shift_status, sr.shift_type_options as shift_type_options,
             sr.availability_options as availability_options
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN shift_requests sr ON m.shift_request_id = sr.id
      WHERE m.sender_id=$1
         OR m.receiver_id=$1
         OR (m.team_id IS NOT NULL AND m.team_id = (SELECT team_id FROM users WHERE id=$1))
         OR (m.receiver_id IS NULL AND m.team_id IS NULL AND u.company_id=$3 AND ($2 OR u.role='admin'))
      ORDER BY m.created_at ASC
    `, [req.user.id, isAdmin, req.user.company_id]);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, team_id, content, photo_url, file_url, file_name, broadcast } = req.body;

    // receiver_id=null, team_id=null は「宛先を特定しない」送信として扱う:
    //   作業員が送る場合 → 管理者への連絡（唯一の解釈なので明示フラグは不要）
    //   管理者が送る場合 → 全作業員への一斉送信。こちらは影響範囲が大きいため、
    //     クライアント側のバグで receiver_id/team_id がたまたま未指定になっただけの
    //     ケースと区別できるよう、broadcast=true が明示された場合のみ許可する
    if (!content && !photo_url && !file_url) {
      return res.status(400).json({ success: false, message: 'メッセージ内容・写真・ファイルのいずれかが必要です' });
    }
    if (req.user.role === 'admin' && !receiver_id && !team_id && !broadcast) {
      return res.status(400).json({ success: false, message: '送信先を指定してください（全員へ送信する場合は broadcast を指定してください）' });
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
    // 「宛先なし」メッセージ(receiver_id/team_id共にNULL)は自社の会話にしか属さないはずなので、
    // sender側の会社チェックも入れて他社のメッセージを誤って既読化しないようにする
    const { rows } = await db.query(
      `UPDATE messages SET is_read=true
       WHERE id=$1 AND (
         receiver_id=$2
         OR (
           receiver_id IS NULL AND team_id IS NULL AND $3
           AND sender_id IN (SELECT id FROM users WHERE company_id=$4)
         )
         OR (receiver_id IS NULL AND team_id IS NOT NULL AND NOT $3)
         OR (
           receiver_id IS NULL AND team_id IS NULL AND NOT $3
           AND sender_id IN (SELECT id FROM users WHERE role='admin' AND company_id=$4)
         )
       ) RETURNING *`,
      [req.params.id, req.user.id, isAdmin, req.user.company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
