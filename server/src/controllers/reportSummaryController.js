const db = require('../config/db');
const { summarizeCompletedOrders } = require('../services/aiSummaryService');

// 指定期間内に完了した案件データをAIで要約する。
// 同一会社・同一期間の要約は report_summaries にキャッシュし、
// regenerate=true 指定時のみ再生成する（AI APIの呼び出しコストを抑えるため）。
exports.getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, regenerate } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'start_date, end_dateは必須です' });
    }

    if (regenerate !== 'true') {
      const cached = await db.query(
        'SELECT summary_text, order_count, generated_at FROM report_summaries WHERE company_id=$1 AND start_date=$2 AND end_date=$3',
        [req.user.company_id, start_date, end_date]
      );
      if (cached.rows.length > 0) {
        return res.status(200).json({ success: true, data: { ...cached.rows[0], cached: true } });
      }
    }

    const { rows: orders } = await db.query(`
      SELECT a.id, a.title, a.location, a.updated_at, t.name as team_name
      FROM assignments a
      LEFT JOIN teams t ON a.team_id = t.id
      WHERE a.company_id = $1 AND a.status = 'completed'
        AND a.updated_at::date BETWEEN $2 AND $3
      ORDER BY a.updated_at DESC
    `, [req.user.company_id, start_date, end_date]);

    if (orders.length === 0) {
      return res.status(200).json({
        success: true,
        data: { summary_text: '指定期間内に完了した案件はありません。', order_count: 0, generated_at: new Date().toISOString(), cached: false },
      });
    }

    let summaryText;
    try {
      summaryText = await summarizeCompletedOrders(orders);
    } catch (err) {
      if (err.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'AI要約機能を利用するには、サーバーにANTHROPIC_API_KEYを設定する必要があります',
        });
      }
      throw err;
    }

    const { rows } = await db.query(`
      INSERT INTO report_summaries (company_id, start_date, end_date, summary_text, order_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (company_id, start_date, end_date)
      DO UPDATE SET summary_text = $4, order_count = $5, generated_at = NOW()
      RETURNING summary_text, order_count, generated_at
    `, [req.user.company_id, start_date, end_date, summaryText, orders.length]);

    res.status(200).json({ success: true, data: { ...rows[0], cached: false } });
  } catch (err) {
    next(err);
  }
};
