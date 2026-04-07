import { useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { STATUS_OPTIONS } from '@/utils/constants'
import WorkOrdersTable from './WorkOrdersTable'

export default function TeamLeadPanel({ orders, onStatusChange, onProgressChange }) {
  const { text, getStatusLabel } = useI18n('ja')
  const teams = useMemo(() => Array.from(new Set(orders.map((order) => order.team))), [orders])
  const [selectedTeam, setSelectedTeam] = useState(teams[0] ?? '')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTeam = selectedTeam ? order.team === selectedTeam : true
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Active'
            ? order.status !== 'Completed' && order.status !== 'Not Started'
            : order.status === statusFilter
      return matchesTeam && matchesStatus
    })
  }, [orders, selectedTeam, statusFilter])

  return (
    <section className="fws-panel">
      <header className="fws-panel-header">
        <div>
          <h3>{text.teamLead.title}</h3>
          <p>{text.teamLead.description}</p>
        </div>
        {teams.length > 0 && (
          <div className="fws-filter-set">
            <label>
              {text.teamLead.teamLabel}
              <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.teamLead.statusLabel}
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="All">{text.filters.statusOptions.All}</option>
                <option value="Active">{text.filters.statusOptions.Active}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </header>
      <WorkOrdersTable
        orders={filteredOrders}
        readOnly={false}
        onStatusChange={onStatusChange}
        onProgressChange={onProgressChange}
      />
    </section>
  )
}
