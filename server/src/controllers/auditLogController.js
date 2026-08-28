const db = require('../config/db');

// GET /api/audit-logs — 管理者のみ、自社の監査ログを新しい順に取得
exports.getAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const { rows } = await db.query(
      `SELECT id, actor_user_id, actor_name, action, target_type, target_id, details, created_at
       FROM audit_logs
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.company_id, limit]
    );
    res.status(200).json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};
