// プランごとの上限値。実際の決済(Stripe等)は未接続のため、
// プランの割り当て自体は現状Fieldo運営側が手動でDB更新する想定。
const PLAN_LIMITS = {
  free: { label: 'フリープラン', workerLimit: 10 },
  pro: { label: 'プロプラン', workerLimit: 50 },
  enterprise: { label: 'エンタープライズプラン', workerLimit: null }, // 無制限
};

function getPlanInfo(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

module.exports = { PLAN_LIMITS, getPlanInfo };
