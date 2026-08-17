import { useI18n } from '@/i18n'

export default function SummaryCards({ summary, outstandingCount }) {
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
        <span className="fws-card-label">{text.summary.inProgress}</span>
        <span className="fws-card-value">{formatNumber(summary.inProgress)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.readyForDispatch}</span>
        <span className="fws-card-value">{formatNumber(summary.readyForDispatch)}</span>
      </div>
      <div className="fws-card">
        <span className="fws-card-label">{text.summary.outstandingStarts}</span>
        <span className="fws-card-value">{formatNumber(outstandingCount)}</span>
      </div>
    </div>
  )
}
