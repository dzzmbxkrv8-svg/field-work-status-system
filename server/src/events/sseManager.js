/**
 * Server-Sent Events (SSE) クライアント管理
 * 接続中のクライアントを管理し、イベントをブロードキャストする
 * 通知は会社（companyId）単位に分離される
 */

let nextId = 1
const clients = new Map() // clientId → { res, userId, role, companyId }

/**
 * クライアントを登録する
 */
function addClient(res, userId, role, companyId) {
  const id = nextId++
  clients.set(id, { res, userId, role, companyId })
  return id
}

/**
 * クライアントを削除する
 */
function removeClient(id) {
  clients.delete(id)
}

/**
 * 全クライアントにブロードキャスト
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients.values()) {
    try {
      client.res.write(payload)
    } catch {
      // 書き込み失敗は無視（切断済み）
    }
  }
}

/**
 * 特定ユーザーにのみ送信（worker → 当該worker のみ）
 */
function sendToUser(userId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients.values()) {
    if (client.userId === userId) {
      try {
        client.res.write(payload)
      } catch {
        // 書き込み失敗は無視（切断済み）
      }
    }
  }
}

/**
 * 同じ会社の管理者全員に送信
 */
function sendToAdmins(event, data, companyId) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients.values()) {
    if (client.role === 'admin' && client.companyId === companyId) {
      try {
        client.res.write(payload)
      } catch {
        // 書き込み失敗は無視（切断済み）
      }
    }
  }
}

/**
 * 同じ会社の作業員全員に送信
 */
function sendToWorkers(event, data, companyId) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients.values()) {
    if (client.role === 'worker' && client.companyId === companyId) {
      try {
        client.res.write(payload)
      } catch {
        // 書き込み失敗は無視（切断済み）
      }
    }
  }
}

function getClientCount() {
  return clients.size
}

module.exports = { addClient, removeClient, broadcast, sendToUser, sendToAdmins, sendToWorkers, getClientCount }
