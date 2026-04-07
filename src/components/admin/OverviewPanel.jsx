import SummaryCards from './SummaryCards'
import { useI18n } from '@/i18n'

export default function OverviewPanel({ summary, outstandingStarts, topPriorityOrders }) {
  const { text, formatNumber, formatDue, formatPriorityTag, getStatusLabel } = useI18n('ja')

  return (
    <>
      <SummaryCards summary={summary} outstandingCount={outstandingStarts} />
      <section className="fws-panel">
        <header className="fws-panel-header">
          <h3>{text.overview.title}</h3>
          <span>
            {formatNumber(topPriorityOrders.length)} {text.overview.ordersLabel}
          </span>
        </header>
        <div className="fws-priority-list">
          {topPriorityOrders.length === 0 ? (
            <p>{text.overview.empty}</p>
          ) : (
            topPriorityOrders.map((order) => (
              <article key={order.id} className="fws-priority-item">
                <div>
                  <h4>{order.id}</h4>
                  <p>{order.location}</p>
                </div>
                <div className="fws-priority-meta">
                  <span className={`fws-tag fws-tag-${order.priority.toLowerCase()}`}>
                    {formatPriorityTag(order.priority)}
                  </span>
                  <span>{getStatusLabel(order.status)}</span>
                  <span>{formatDue(order.dueDate)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  )
}
