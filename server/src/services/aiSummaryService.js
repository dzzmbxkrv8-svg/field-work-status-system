// 完了済み案件データをAIに要約させるサービス。
//
// ANTHROPIC_API_KEY が設定されていれば Anthropic Claude（有料・高品質）を、
// 未設定でGEMINI_API_KEYがあれば Google Gemini（無料枠あり）を使う。
// どちらも未設定の場合は AI_NOT_CONFIGURED エラーを投げる。
// 本番移行時はRenderの環境変数にANTHROPIC_API_KEYを追加するだけで、
// コード変更なしに自動でAnthropic側へ切り替わる。

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

async function summarizeWithAnthropic(orders, apiKey) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
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

async function summarizeWithGemini(orders, apiKey) {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(orders) }] }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`AI要約の生成に失敗しました (status ${res.status}): ${detail}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    const err = new Error('AIからの応答が空でした');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }
  return text;
}

async function summarizeCompletedOrders(orders) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return summarizeWithAnthropic(orders, anthropicKey);

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return summarizeWithGemini(orders, geminiKey);

  const err = new Error('ANTHROPIC_API_KEY / GEMINI_API_KEY のいずれも設定されていません');
  err.code = 'AI_NOT_CONFIGURED';
  throw err;
}

module.exports = { summarizeCompletedOrders };
