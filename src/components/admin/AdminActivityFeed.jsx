import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { formatAdminDate } from '@/utils/format'

export default function AdminActivityFeed({ orders }) {
  const { text } = useI18n()

  const completed = useMemo(() => {
    return [...orders]
      .filter(o => o.status === 'completed' || o.status === 'Completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }, [orders])

  return (
    <section className="admin-feed">
      <header>
        <h4>✅ 最近完了した案件</h4>
      </header>
      {completed.length === 0 ? (
        <p className="admin-feed-empty">完了した案件はまだありません</p>
      ) : (
        <ul className="admin-feed-list">
          {completed.map((order) => (
            <li key={order.id} className="admin-feed-item">
              <div>
                <strong>{order.projectName || order.title || order.id}</strong>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: '#64748b' }}>
                  {order.location ? `📍 ${order.location}` : order.team}
                </span>
              </div>
              <div className="admin-feed-meta">
                {order.assignedWorkerName && (
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    👤 {order.assignedWorkerName}
                  </span>
                )}
                <span>{formatAdminDate(order.updatedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
