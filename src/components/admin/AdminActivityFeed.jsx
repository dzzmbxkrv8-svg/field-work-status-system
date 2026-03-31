import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { formatAdminDate } from '@/utils/format'

export default function AdminActivityFeed({ orders }) {
  const { text, getStatusLabel } = useI18n()

  const updates = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }, [orders])

  if (updates.length === 0) {
    return <p className="admin-feed-empty">{text.admin.feedEmpty}</p>
  }

  return (
    <section className="admin-feed">
      <header>
        <h4>{text.admin.feedTitle}</h4>
      </header>
      <ul className="admin-feed-list">
        {updates.map((update) => (
          <li key={update.id} className="admin-feed-item">
            <div>
              <strong>{update.id}</strong>
              <span>{text.admin.feedItemBy(update.team)}</span>
            </div>
            <div className="admin-feed-meta">
              <span className={`worker-chip worker-chip-${update.priority.toLowerCase()}`}>
                {getStatusLabel(update.status)}
              </span>
              <span>{formatAdminDate(update.updatedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
