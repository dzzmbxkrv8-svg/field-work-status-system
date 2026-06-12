const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const db = require('../config/db')
const { addClient, removeClient, getClientCount } = require('../events/sseManager')

/**
 * GET /api/events
 * SSE 接続エンドポイント
 * EventSource はカスタムヘッダーを使えないため、token をクエリパラメーターで受け取る
 */
router.get('/', async (req, res) => {
  // トークン検証（クエリパラメーターから）
  const token = req.query.token
  if (!token) {
    return res.status(401).json({ success: false, message: '認証が必要です' })
  }

  let user
  try {
    user = jwt.verify(token, process.env.JWT_SECRET)
  } catch (_) {
    return res.status(401).json({ success: false, message: '無効なトークンです' })
  }

  // 会社IDはDBの最新値を使う（古いトークンにも対応）
  let companyId = user.company_id
  if (!companyId) {
    try {
      const { rows } = await db.query('SELECT company_id FROM users WHERE id = $1', [user.id])
      companyId = rows[0]?.company_id
    } catch (_) {}
  }

  // SSE ヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx バッファリング無効
  res.flushHeaders()

  // 接続確認イベントを送信
  const clientId = addClient(res, user.id, user.role, companyId)
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, userId: user.id })}\n\n`)

  // 30秒ごとにハートビート（接続維持・切断検知）
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n')
    } catch (_) {
      clearInterval(heartbeat)
    }
  }, 30000)

  // 切断時のクリーンアップ
  req.on('close', () => {
    clearInterval(heartbeat)
    removeClient(clientId)
  })
})

module.exports = router
