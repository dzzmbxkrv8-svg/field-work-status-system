const db = require('../config/db');
const { sendToWorkers } = require('../events/sseManager');
const { logAction } = require('../services/auditLogService');
const { getPlanInfo } = require('../config/plans');

// ── お知らせ ──────────────────────────────────────────────────────────────

// GET /api/settings/announcement — 全員取得可（自社のもののみ）
const getAnnouncement = async (req, res, next) => {
  try {
    const result = await db.query(
      "SELECT value, updated_at FROM settings WHERE key = 'announcement' AND company_id = $1",
      [req.user.company_id]
    );
    const row = result.rows[0];
    res.json({ success: true, value: row?.value ?? '', updatedAt: row?.updated_at ?? null });
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings/announcement — 管理者のみ
const updateAnnouncement = async (req, res, next) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'string') {
      return res.status(400).json({ success: false, message: 'value は文字列で指定してください' });
    }
    const result = await db.query(
      `INSERT INTO settings (company_id, key, value, updated_at, updated_by)
       VALUES ($1, 'announcement', $2, NOW(), $3)
       ON CONFLICT (company_id, key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW(),
             updated_by = EXCLUDED.updated_by
       RETURNING value, updated_at`,
      [req.user.company_id, value, req.user.id]
    );
    sendToWorkers('announcement_updated', { value: result.rows[0].value }, req.user.company_id);
    logAction(req, 'announcement.update', 'announcement', null, { value: result.rows[0].value });
    res.json({ success: true, value: result.rows[0].value, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    next(err);
  }
};

// ── 会社アクセスコード ────────────────────────────────────────────────────

// GET /api/settings/access-code — 管理者のみ取得
// アクセスコードはFieldo運営が一意に発行するため、読み取り専用
const getAccessCode = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT access_code, name, updated_at FROM companies WHERE id = $1',
      [req.user.company_id]
    );
    const row = result.rows[0];
    res.json({
      success: true,
      value: row?.access_code ?? '',
      companyName: row?.name ?? '',
      updatedAt: row?.updated_at ?? null,
    });
  } catch (err) {
    next(err);
  }
};

// ── 契約プラン ────────────────────────────────────────────────────────────

// GET /api/settings/plan — 管理者のみ。現在のプランと作業員数/上限を返す。
// 実際の決済(Stripe等)は未接続のため、プラン自体はFieldo運営が手動で
// companies.plan を更新する想定。ここでは現状の利用状況を可視化するのみ。
const getPlan = async (req, res, next) => {
  try {
    const companyResult = await db.query('SELECT plan FROM companies WHERE id = $1', [req.user.company_id]);
    const plan = companyResult.rows[0]?.plan || 'free';
    const planInfo = getPlanInfo(plan);

    const countResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE role = 'worker' AND is_active = true AND company_id = $1`,
      [req.user.company_id]
    );
    const workerCount = Number(countResult.rows[0].cnt);

    res.json({
      success: true,
      data: {
        plan,
        planLabel: planInfo.label,
        workerCount,
        workerLimit: planInfo.workerLimit, // null = 無制限
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnnouncement, updateAnnouncement, getAccessCode, getPlan };
