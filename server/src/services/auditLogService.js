// 管理者による重要な操作の監査ログを記録するサービス。
// ログ記録の失敗が本来の処理を妨げないよう、呼び出し側でawaitせず
// fire-and-forgetで使うことを想定している。

const db = require('../config/db');

/**
 * @param {object} req - Express の req（req.user から company_id / actor 情報を取得）
 * @param {string} action - 例: 'worker.create', 'worker.update', 'team.delete' など
 * @param {string} targetType - 例: 'worker', 'team', 'assignment', 'announcement'
 * @param {number|null} targetId
 * @param {object} [details] - 変更内容の要約（JSON化して保存）
 */
async function logAction(req, action, targetType, targetId, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (company_id, actor_user_id, actor_name, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.company_id,
        req.user.id,
        req.user.name || req.user.employee_id || null,
        action,
        targetType,
        targetId ?? null,
        JSON.stringify(details || {}),
      ]
    );
  } catch (err) {
    console.warn('[auditLogService] 記録に失敗しました:', err.message);
  }
}

module.exports = { logAction };
