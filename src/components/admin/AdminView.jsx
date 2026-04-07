import { ROLE_TABS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/utils/constants'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { useReports } from '@/hooks/useReports'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import WorkOrdersTable from './WorkOrdersTable'
import AdminPanel from './AdminPanel'
import AttendancePanel from './AttendancePanel'
import MessagePanel from './MessagePanel'
import OverviewPanel from './OverviewPanel'
import ReportsPanel from './ReportsPanel'
import WorkerAssignmentDialog from './WorkerAssignmentDialog'
import BottomNavigation from './BottomNavigation'
import { useState } from 'react'

export default function AdminView() {
  const { state, dispatch, logout } = useAppContext()
  const {
    filters,
    sortedOrders,
    filteredOrders,
    summary,
    outstandingStarts,
    topPriorityOrders,
    createOrder,
    updateOrder,
  } = useReports()
  const timeEntriesHook = useTimeEntries()
  const { session, selectedTab, language, workers } = state
  const { text, getStatusLabel, getPriorityLabel } = useI18n('ja')
  const [assigningOrder, setAssigningOrder] = useState(null)

  const handleAssignWorkers = (order) => {
    setAssigningOrder(order)
  }

  const handleSaveAssignments = (members) => {
    if (assigningOrder) {
      updateOrder(assigningOrder.id, { members })
      setAssigningOrder(null)
    }
  }

  const handleTabChange = (tab) => {
    dispatch({ type: 'SET_TAB', payload: tab })
  }

  const handleFilterChange = (payload) => {
    dispatch({ type: 'UPDATE_FILTERS', payload })
  }

  return (
    <div className="field-work-app">
      <header className="fws-header admin">
        <div className="fws-header-brand">
          <h1>{text.header.title}</h1>
          <p>{text.header.subtitle}</p>
        </div>

        <div className="fws-header-actions">
          <nav className="fws-tablist admin" aria-label={text.header.roleNavAria}>
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`fws-tab ${selectedTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span className="fws-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="fws-tab-label">{text.tabs[tab.id]}</span>
              </button>
            ))}
          </nav>

          <div className="fws-header-side">
            <div className="fws-user-chip">
              <span>{text.login.roleOptions.admin}</span>
              <strong>{session.name}</strong>
            </div>
            <button type="button" className="fws-button tertiary logout-btn" onClick={logout}>
              {text.actions.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Common Filters - Only show for relevant tabs if needed, or keep global */}
      {(selectedTab === 'orders' || selectedTab === 'monitoring') && (
        <section className="fws-panel filters">
          <div className="fws-filter-grid">
            <label>
              {text.filters.searchLabel}
              <input
                type="search"
                placeholder={text.filters.searchPlaceholder}
                value={filters.search}
                onChange={(event) => handleFilterChange({ search: event.target.value })}
              />
            </label>
            <label>
              {text.filters.statusLabel}
              <select value={filters.status} onChange={(event) => handleFilterChange({ status: event.target.value })}>
                <option value="All">{text.filters.statusOptions.All}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text.filters.priorityLabel}
              <select
                value={filters.priority}
                onChange={(event) => handleFilterChange({ priority: event.target.value })}
              >
                <option value="All">{text.filters.priorityOptions.All}</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {selectedTab === 'overview' && (
        <OverviewPanel summary={summary} outstandingStarts={outstandingStarts} topPriorityOrders={topPriorityOrders} />
      )}
      {selectedTab === 'monitoring' && (
        <AttendancePanel workers={workers} orders={sortedOrders} timeEntriesHook={timeEntriesHook} />
      )}
      {selectedTab === 'orders' && (
        <AdminPanel orders={filteredOrders} onCreateOrder={createOrder} onAssignWorkers={handleAssignWorkers} />
      )}
      {selectedTab === 'messages' && <MessagePanel workers={workers} />}
      {selectedTab === 'reports' && <ReportsPanel orders={sortedOrders} workers={workers} timeEntriesHook={timeEntriesHook} />}

      {assigningOrder && (
        <WorkerAssignmentDialog
          order={assigningOrder}
          workers={workers}
          onSave={handleSaveAssignments}
          onClose={() => setAssigningOrder(null)}
        />
      )}

      <BottomNavigation selectedTab={selectedTab} onTabChange={handleTabChange} />
    </div>
  )
}
