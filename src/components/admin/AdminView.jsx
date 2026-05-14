import { ROLE_TABS } from '@/utils/constants'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import WorkOrdersTable from './WorkOrdersTable'
import AdminPanel from './AdminPanel'
import MessagePanel from './MessagePanel'
import DashboardPanel from './DashboardPanel'
import ReportsPanel from './ReportsPanel'
import WorkerAssignmentDialog from './WorkerAssignmentDialog'
import BottomNavigation from './BottomNavigation'
import TeamManagementPanel from './TeamManagementPanel'
import { useState, useEffect, useMemo } from 'react'
import { assignWorker } from '@/api/assignments'
import { getWorkers } from '@/api/workers'

export default function AdminView() {
  const { state, dispatch, logout } = useAppContext()
  const { session, selectedTab, messages: allMessages = [] } = state
  const { text } = useI18n(state.language)
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [assignError, setAssignError] = useState(null)
  const [dbWorkers, setDbWorkers] = useState([])

  // メッセージ未読バッジ（state.messages はMessagePanel初回レンダー時にセットされる）
  const unreadMessages = useMemo(() => {
    const lastViewed = parseInt(localStorage.getItem('lastViewedMessagesAt') || '0', 10)
    return allMessages.filter(m =>
      m.sender_id !== session?.id &&
      new Date(m.created_at).getTime() > lastViewed
    ).length
  }, [allMessages, session?.id])

  useEffect(() => {
    getWorkers().then(res => { if (res.success) setDbWorkers(res.data || []) })
  }, [])

  const handleAssignWorkers = (order) => {
    setAssigningOrder(order)
    setAssignError(null)
  }

  const handleSaveAssignments = async (workerId) => {
    if (!assigningOrder) return
    const dbId = assigningOrder.db_id || assigningOrder.id
    const result = await assignWorker(dbId, workerId)
    if (result.success) {
      setAssigningOrder(null)
      setAssignError(null)
    } else {
      setAssignError(result.message || '割り振りの保存に失敗しました')
    }
  }

  const handleTabChange = (tab) => {
    if (tab === 'messages') {
      localStorage.setItem('lastViewedMessagesAt', Date.now().toString())
    }
    dispatch({ type: 'SET_TAB', payload: tab })
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
                style={{ position: 'relative' }}
              >
                <span className="fws-tab-icon" aria-hidden="true">
                  {tab.icon}
                </span>
                <span className="fws-tab-label">{text.tabs[tab.id]}</span>
                {tab.id === 'messages' && unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    background: '#ef4444', color: '#fff',
                    borderRadius: '999px', fontSize: '0.6rem', fontWeight: 700,
                    minWidth: 15, height: 15, lineHeight: '15px',
                    textAlign: 'center', padding: '0 3px',
                  }}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
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


      {selectedTab === 'dashboard' && <DashboardPanel />}
      {selectedTab === 'orders' && (
        <AdminPanel onAssignWorkers={handleAssignWorkers} workers={dbWorkers} />
      )}
      {selectedTab === 'messages' && <MessagePanel workers={dbWorkers} />}
      {selectedTab === 'reports' && <ReportsPanel />}
      {selectedTab === 'teams' && <TeamManagementPanel />}

      {assigningOrder && (
        <WorkerAssignmentDialog
          order={assigningOrder}
          workers={dbWorkers}
          onSave={handleSaveAssignments}
          onClose={() => { setAssigningOrder(null); setAssignError(null) }}
          error={assignError}
        />
      )}

      <BottomNavigation selectedTab={selectedTab} onTabChange={handleTabChange} unreadMessages={unreadMessages} />
    </div>
  )
}
