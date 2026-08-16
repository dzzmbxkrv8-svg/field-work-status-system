const db = require('../config/db');
const { sendToUser, sendToWorkers, sendToAdmins } = require('../events/sseManager');

// receiver_id/team_id が両方ともNULLの「宛先なし」メッセージをどう扱うかの規約:
//   作業員が送った場合 → 管理者への連絡（自社の管理者全員に見える）
//   管理者が送った場合 → 全作業員への一斉送信（自社の全員に見える）
// つまり「管理者からは常に見える／作業員からは送信者が管理者の場合だけ見える」。
// この判定はメッセージの可視性チェック(getMessages, markAsRead)で共通して使うため
// 関数化しておく。sendMessage()のSSE通知先振り分けも同じ規約に従っているが、
// あちらは挿入直後の行のroleが既にJS側でわかっているためDB問い合わせは不要。
// senderIdExpr: SQL上のsender_idを指す式（例: 'm.sender_id'）
// isAdminParam / companyIdParam: プレースホルダ番号（例: '$2', '$3'）
function unaddressedMessageVisibilitySQL(senderIdExpr, isAdminParam, companyIdParam) {
  return `(${senderIdExpr} IN (
    SELECT id FROM users WHERE company_id = ${companyIdParam} AND (${isAdminParam} OR role = 'admin')
  ))`;
}

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
         OR (m.receiver_id IS NULL AND m.team_id IS NULL AND ${unaddressedMessageVisibilitySQL('m.sender_id', '$2', '$3')})
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
    // getMessages と同じ可視性の規約(unaddressedMessageVisibilitySQL)を使い、
    // 見えないメッセージを誤って既読化できないようにする。
    // チーム宛(team_id IS NOT NULL)のメッセージも、以前は自分のチームかどうかを
    // チェックしておらず他チーム宛のメッセージまで既読化できてしまっていたため、
    // getMessages と同様に自分の所属チームであることを確認するよう修正。
    const { rows } = await db.query(
      `UPDATE messages SET is_read=true
       WHERE id=$1 AND (
         receiver_id=$2
         OR (team_id IS NOT NULL AND team_id = (SELECT team_id FROM users WHERE id=$2))
         OR (receiver_id IS NULL AND team_id IS NULL AND ${unaddressedMessageVisibilitySQL('sender_id', '$3', '$4')})
       ) RETURNING *`,
      [req.params.id, req.user.id, isAdmin, req.user.company_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
