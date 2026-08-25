// 完了済み案件データをAI（Anthropic Claude）に要約させるサービス。
// 利用にはサーバー環境変数 ANTHROPIC_API_KEY の設定が必要。
// 未設定の場合は AI_NOT_CONFIGURED エラーを投げるので、呼び出し側で
// 「AI要約機能が未設定です」等のメッセージに変換すること。

const MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';

function buildPrompt(orders) {
  const listText = orders.map(o => {
    const completedDate = o.updated_at ? new Date(o.updated_at).toLocaleDateString('ja-JP') : '不明';
    return `・${o.title}（場所: ${o.location || '未設定'} / チーム: ${o.team_name || '未所属'} / 完了日: ${completedDate}）`;
  }).join('\n');

  return `あなたは建設・現場作業を管理する会社の業務アシスタントです。
以下は指定期間内に完了した案件の一覧です。管理者が状況をすぐ把握できるよう、
日本語で簡潔に（箇条書き中心・200〜300字程度）要約してください。

# 出力に含める内容
- 完了件数の概要
- 場所やチームに偏り・目立つ傾向があれば言及
- 特筆すべき懸念点があれば指摘（なければ「特筆すべき懸念事項はありません」と明記）

# 完了案件一覧（${orders.length}件）
${listText}
`;
}

async function summarizeCompletedOrders(orders) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY が設定されていません');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: buildPrompt(orders) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`AI要約の生成に失敗しました (status ${res.status}): ${detail}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text?.trim();
  if (!text) {
    const err = new Error('AIからの応答が空でした');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return text;
}

module.exports = { summarizeCompletedOrders };
