const { haversineDistanceKm } = require('../utils/geo');

const DISTANCE_UNKNOWN_SCORE = 0.3; // 住所未登録（座標不明）の作業員に与える中立スコア
const DISTANCE_CUTOFF_KM = 50; // これ以上遠いと距離スコアは0扱い
const WEIGHT_DISTANCE = 0.6;
const WEIGHT_LOAD = 0.4;
const SKILL_DUPLICATE_PENALTY = 0.15; // 既選出者と同じスキルレベルを選ぶ際のペナルティ

function distanceScoreOf(distanceKm) {
  if (distanceKm == null) return DISTANCE_UNKNOWN_SCORE;
  return Math.max(0, 1 - distanceKm / DISTANCE_CUTOFF_KM);
}

function loadScoreOf(load, minLoad, maxLoad) {
  if (maxLoad === minLoad) return 1;
  return 1 - (load - minLoad) / (maxLoad - minLoad);
}

/**
 * 候補作業員をスコアリングし、必要人数分をスキルバランスも考慮して選定する。
 * @param {{lat:number,lng:number}|null} site 現場座標（geocode失敗時はnull＝全員距離不明扱い）
 * @param {Array<{id:number,name:string,lat:number|null,lng:number|null,skill_level:number|null,recent_load:number}>} workers
 * @param {number} count 必要人数
 * @returns {{ candidates: Array, recommendedIds: number[] }}
 */
function scoreAndSelectWorkers(site, workers, count) {
  const loads = workers.map(w => Number(w.recent_load) || 0);
  const minLoad = loads.length ? Math.min(...loads) : 0;
  const maxLoad = loads.length ? Math.max(...loads) : 0;

  const candidates = workers.map(w => {
    const hasCoords = site && w.lat != null && w.lng != null;
    const distanceKm = hasCoords
      ? haversineDistanceKm(site.lat, site.lng, Number(w.lat), Number(w.lng))
      : null;
    const recentLoad = Number(w.recent_load) || 0;
    const dScore = distanceScoreOf(distanceKm);
    const lScore = loadScoreOf(recentLoad, minLoad, maxLoad);
    const baseScore = WEIGHT_DISTANCE * dScore + WEIGHT_LOAD * lScore;
    return {
      id: w.id,
      name: w.name,
      team_name: w.team_name || null,
      skill_level: w.skill_level ?? null,
      recent_load: recentLoad,
      distance_km: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      base_score: baseScore,
    };
  });

  // スキル分散を考慮した貪欲選定（__pickedはpool内部だけの一時フラグなので、
  // candidatesとは独立したコピーを操作し、レスポンスに漏れないようにする）
  const pool = candidates.map(c => ({ ...c })).sort((a, b) => b.base_score - a.base_score);
  const selected = [];
  const skillCounts = {};
  const n = Math.max(0, Math.min(count, pool.length));

  for (let i = 0; i < n; i++) {
    let bestIdx = -1;
    let bestAdjustedScore = -Infinity;
    for (let j = 0; j < pool.length; j++) {
      if (pool[j].__picked) continue;
      const skill = pool[j].skill_level;
      const dupPenalty = skill != null && skillCounts[skill] ? SKILL_DUPLICATE_PENALTY * skillCounts[skill] : 0;
      const adjustedScore = pool[j].base_score - dupPenalty;
      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIdx = j;
      }
    }
    if (bestIdx === -1) break;
    pool[bestIdx].__picked = true;
    if (pool[bestIdx].skill_level != null) {
      skillCounts[pool[bestIdx].skill_level] = (skillCounts[pool[bestIdx].skill_level] || 0) + 1;
    }
    selected.push(pool[bestIdx].id);
  }

  // 表示用に基礎スコア降順で返す（recommendedIdsで選出済みかどうかをフロント側が判定）
  const sortedCandidates = candidates
    .slice()
    .sort((a, b) => b.base_score - a.base_score)
    .map(({ base_score, ...rest }) => ({ ...rest, score: Math.round(base_score * 1000) / 1000 }));

  return { candidates: sortedCandidates, recommendedIds: selected };
}

module.exports = { scoreAndSelectWorkers };
