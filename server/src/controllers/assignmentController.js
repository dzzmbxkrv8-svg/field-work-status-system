const db = require('../config/db');

exports.getAssignments = async (req, res, next) => {
  try {
    let query, params;
    const baseSelect = `
      SELECT a.*,
             t.name  AS team_name,
             w.name  AS assigned_worker_name
      FROM assignments a
      LEFT JOIN teams  t ON a.team_id  = t.id
      LEFT JOIN users  w ON a.assigned_worker_id = w.id
    `;
    if (req.user.role === 'admin') {
      query = baseSelect + ' ORDER BY a.created_at DESC';
      params = [];
    } else {
      query = baseSelect + ' WHERE a.team_id = (SELECT team_id FROM users WHERE id=$1) ORDER BY a.created_at DESC';
      params = [req.user.id];
    }
    const { rows } = await db.query(query, params);
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (error) {
    next(error);
  }
};

exports.getAssignment = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM assignments WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const { assignment_code, title, location, team_id, priority, start_date, end_date, description } = req.body;
    if (!assignment_code || !assignment_code.trim()) {
      return res.status(400).json({ success: false, message: '案件コードは必須です' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '案件名は必須です' });
    }
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: '優先度は low/medium/high のいずれかです' });
    }
    const { rows } = await db.query(`
      INSERT INTO assignments (assignment_code, title, location, team_id, priority, start_date, end_date, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [assignment_code.trim(), title.trim(), location || null, team_id || null, priority || 'medium', start_date || null, end_date || null, description || null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { title, location, start_date, end_date, priority, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '案件名は必須です' });
    }
    const validPriorities = ['low', 'medium', 'high'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: '優先度は low/medium/high のいずれかです' });
    }
    const { rows } = await db.query(`
      UPDATE assignments
      SET title=$1, location=$2, start_date=$3, end_date=$4, priority=$5, description=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *
    `, [title.trim(), location || null, start_date || null, end_date || null, priority || 'medium', description || null, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '案件が見つかりません' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'ステータスは pending/in_progress/completed/cancelled のいずれかです' });
    }

    // 作業員は自分が担当する案件のみ更新可能
    if (req.user.role !== 'admin') {
      const check = await db.query(
        'SELECT id FROM assignments WHERE id=$1 AND assigned_worker_id=$2',
        [req.params.id, req.user.id]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'この案件のステータスを変更する権限がありません' });
      }
    }

    const { rows } = await db.query('UPDATE assignments SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.assignWorker = async (req, res, next) => {
  try {
    const { worker_id } = req.body;
    if (worker_id !== null && worker_id !== undefined) {
      const workerCheck = await db.query('SELECT id FROM users WHERE id=$1 AND role=$2', [worker_id, 'worker']);
      if (workerCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: '指定された作業員が見つかりません' });
      }
    }
    const { rows } = await db.query(
      'UPDATE assignments SET assigned_worker_id=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [worker_id || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '案件が見つかりません' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// 複数メンバーを一括登録（既存メンバーは上書き）
exports.setMembers = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const { member_ids } = req.body; // number[]
    if (!Array.isArray(member_ids)) {
      return res.status(400).json({ success: false, message: 'member_ids must be an array' });
    }
    // 既存メンバーを全削除して再登録
    await db.query('DELETE FROM assignment_members WHERE assignment_id=$1', [assignmentId]);
    if (member_ids.length > 0) {
      const placeholders = member_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await db.query(
        `INSERT INTO assignment_members (assignment_id, user_id) VALUES ${placeholders}`,
        [assignmentId, ...member_ids]
      );
    }
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// メンバー一覧取得
exports.getMembers = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.employee_id, t.name AS team_name
       FROM assignment_members am
       JOIN users u ON am.user_id = u.id
       LEFT JOIN teams t ON u.team_id = t.id
       WHERE am.assignment_id = $1`,
      [req.params.id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
