import { useI18n } from '@/i18n'

export default function SummaryCards({ summary, outstandingCount, notReportedCount, unreadWorkerMessageCount }) {
  const { text, formatNumber } = useI18n()

  return (
    <div className="fws-summary-grid">
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.activeOrders}</span>
        <span className="fws-card-value">{formatNumber(summary.total)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.completionRate}</span>
        <span className="fws-card-value">{formatNumber(summary.completionRate)}%</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.delayed}</span>
        <span className="fws-card-value fws-accent">{formatNumber(summary.delayed)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.outstandingStarts}</span>
        <span className="fws-card-value">{formatNumber(outstandingCount)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.notReportedToday}</span>
        <span className="fws-card-value fws-accent">{formatNumber(notReportedCount)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.unreadWorkerMessages}</span>
        <span className="fws-card-value fws-accent">{formatNumber(unreadWorkerMessageCount)}</span>
      </div>
    </div>
  )
}
