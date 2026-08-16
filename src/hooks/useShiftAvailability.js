import { useEffect, useState } from 'react'
import { getAvailableWorkers } from '@/api/shifts'

// 指定した作業期間について、会社の作業員それぞれのシフト回答状況を取得する。
// CreateOrderWizard(新規案件作成)とWorkerAssignmentDialog(担当者割り当て)の
// 両方で同じ「作業期間からシフト回答を引いて候補を絞り込む」処理が必要なため、
// 取得〜マップ化までをここに共通化している（候補の絞り込みルール自体は
// 用途によって微妙に異なるため、フィルタリングは呼び出し側のuseMemoに任せる）。
//
// 戻り値の availabilityMap は { [workerId]: available } の形。
//   available === true  … ○(出勤可)と回答済み
//   available === false … ×(出勤不可)と回答済み
//   available === null  … 未回答、または△(応相談)など未確定
// startDate が未指定の間、または取得に失敗した場合は availabilityMap は null
// （＝絞り込み情報なし＝全員表示扱い）のままになる。
export function useShiftAvailability(startDate, endDate) {
  const [availabilityMap, setAvailabilityMap] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!startDate) {
      setAvailabilityMap(null)
      return
    }
    const end = endDate || startDate
    let cancelled = false
    setLoading(true)
    getAvailableWorkers(startDate, end).then(res => {
      if (cancelled) return
      if (res.success) {
        const map = {}
        res.data.forEach(entry => { map[entry.worker_id] = entry.available })
        setAvailabilityMap(map)
      } else {
        setAvailabilityMap(null)
      }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [startDate, endDate])

  return { availabilityMap, loading }
}
