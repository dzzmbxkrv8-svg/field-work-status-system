import { useI18n } from '@/i18n'
import { formatAdminDate } from '@/utils/format'
import { STATUS_OPTIONS } from '@/utils/constants'

export default function WorkOrdersTable({
  orders,
  readOnly,
  onStatusChange,
  onProgressChange,
  onAssignWorkers,
}) {
  const { text, formatNumber, getPriorityLabel, getStatusLabel, getSafetyCheckLabel } = useI18n('ja')

  if (orders.length === 0) {
    return <p className="fws-empty">{text.table.empty}</p>
  }

  return (
    <div className="fws-table-wrapper">
      <table className="fws-table">
        <thead>
          <tr>
            <th>{text.table.headers.order}</th>
            <th>{text.table.headers.team}</th>
            <th>{text.table.headers.supervisor}</th>
            <th>{text.table.headers.location}</th>
            <th>{text.table.headers.status}</th>
            <th>{text.table.headers.progress}</th>
            <th>{text.table.headers.priority}</th>
            <th>{text.table.headers.crew}</th>
            <th>{text.table.headers.start}</th>
            <th>{text.table.headers.due}</th>
            <th>{text.table.headers.safety}</th>
            <th>{text.table.headers.notes}</th>
            <th>{text.table.headers.updated}</th>
            {!readOnly && <th>{text.table.headers.actions}</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label={text.table.headers.order}>{order.id}</td>
              <td data-label={text.table.headers.team}>{order.team}</td>
              <td data-label={text.table.headers.supervisor}>{order.supervisor}</td>
              <td data-label={text.table.headers.location}>{order.location}</td>
              <td data-label={text.table.headers.status}>
                {readOnly ? (
                  getStatusLabel(order.status)
                ) : (
                  <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value)}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td data-label={text.table.headers.progress}>
                {readOnly ? (
                  `${order.progress}%`
                ) : (
                  <div className="fws-progress-editor">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={order.progress}
                      onChange={(event) =>
                        onProgressChange(order.id, Number.parseInt(event.target.value, 10))
                      }
                    />
                    <span>{order.progress}%</span>
                  </div>
                )}
              </td>
              <td data-label={text.table.headers.priority}>
                <span className={`fws-priority fws-priority-${order.priority.toLowerCase()}`}>
                  {getPriorityLabel(order.priority)}
                </span>
              </td>
              <td data-label={text.table.headers.crew}>{formatNumber(order.crewCount)}</td>
              <td data-label={text.table.headers.start}>{formatAdminDate(order.startDate)}</td>
              <td data-label={text.table.headers.due}>{formatAdminDate(order.dueDate)}</td>
              <td data-label={text.table.headers.safety}>{getSafetyCheckLabel(order.safetyCheck)}</td>
              <td data-label={text.table.headers.notes}>{order.notes || '—'}</td>
              <td data-label={text.table.headers.updated}>{formatAdminDate(order.updatedAt)}</td>
              {!readOnly && (
                <td data-label={text.table.headers.actions}>
                  <button
                    type="button"
                    className="fws-button tertiary small"
                    onClick={() => onAssignWorkers(order)}
                  >
                    {text.admin.assignWorkers}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
