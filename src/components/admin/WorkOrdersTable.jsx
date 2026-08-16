import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { formatAdminDate } from '@/utils/format'
import { AppIcon } from '@/utils/iconMap'

const statusStyles = {
  pending:     { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' },
  in_progress: { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7c7f0' },
  completed:   { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  cancelled:   { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
}
const statusLabels = {
  pending:     '未着手',
  in_progress: '進行中',
  completed:   '完了',
  cancelled:   'キャンセル',
}

export default function WorkOrdersTable({
  orders,
  readOnly,
  onCancel,
  onAssignWorkers,
  onEdit,
  onSelect,
}) {
  const { state } = useAppContext()
  const { text } = useI18n(state.language)

  if (orders.length === 0) {
    return <p className="fws-empty">{text.table.empty}</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {orders.map((order) => {
        const sKey = (order.status || 'pending').toLowerCase()
        const sStyle = statusStyles[sKey] || statusStyles.pending
        const sLabel = statusLabels[sKey] || order.status

        const isCancellable = !readOnly && sKey !== 'cancelled' && sKey !== 'completed'

        return (
          <div key={order.id}
            onClick={() => onSelect && onSelect(order)}
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              opacity: sKey === 'cancelled' ? 0.6 : 1,
              cursor: onSelect ? 'pointer' : 'default',
            }}>
            {/* 1行目：案件名・ステータスバッジ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{order.projectName || order.id}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                borderRadius: '999px', ...sStyle,
              }}>
                {sLabel}
              </span>
            </div>

            {/* 2行目：現場 */}
            {order.location && (
              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <AppIcon name="MapPin" size={11} strokeWidth={2} />{order.location}
              </div>
            )}

            {/* 3行目：チーム・担当者・勤務区分（シフト確定から連携された場合） */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#64748b', alignItems: 'center', flexWrap: 'wrap' }}>
              {order.team && <span>チーム: {order.team}</span>}
              {order.assignedWorkerName && <span>担当: {order.assignedWorkerName}</span>}
              {order.shift_type && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, color: '#4338ca',
                  background: '#eef2ff', borderRadius: 999, padding: '0.1rem 0.55rem',
                }}>{order.shift_type}</span>
              )}
            </div>

            {/* 4行目：日付・操作ボタン */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {formatAdminDate(order.startDate)}
                {order.dueDate && order.dueDate !== order.startDate && ` 〜 ${formatAdminDate(order.dueDate)}`}
              </span>
              {!readOnly && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{
                      fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                      borderRadius: '8px', border: '1px solid #c7c7f0',
                      background: '#eef2ff', color: '#4f46e5', cursor: 'pointer',
                    }}
                    onClick={() => onEdit && onEdit(order)}
                  >
                    <AppIcon name="Pencil" size={12} strokeWidth={2} style={{ flexShrink: 0 }} /> 編集
                  </button>
                  <button
                    type="button"
                    className="fws-button tertiary small"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem' }}
                    onClick={() => onAssignWorkers(order)}
                  >
                    {text.admin.assignWorkers}
                  </button>
                  {isCancellable && (
                    <button
                      type="button"
                      style={{
                        fontSize: '0.72rem', padding: '0.25rem 0.6rem',
                        borderRadius: '8px', border: '1px solid #fecaca',
                        background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                      }}
                      onClick={() => onCancel && onCancel(order)}
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
