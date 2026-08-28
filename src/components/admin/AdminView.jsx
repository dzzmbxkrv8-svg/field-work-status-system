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
import ShiftPanel from './ShiftPanel'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { assignWorker } from '@/api/assignments'
import { getWorkers } from '@/api/workers'
import { AppIcon } from '@/utils/iconMap'
import { useServerEvents } from '@/hooks/useServerEvents'
import * as messagesApi from '@/api/messages'

export default function AdminView() {
  const { state, dispatch, logout } = useAppContext()
  const { session, selectedTab, messages: allMessages = [] } = state
  const { text } = useI18n(state.language)
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [assignError, setAssignError] = useState(null)
  const [dbWorkers, setDbWorkers] = useState([])

  // メッセージ未読バッジ（is_read ベース）
  const unreadMessages = useMemo(() => {
    return allMessages.filter(m =>
      m.sender_id !== session?.id && !m.is_read
    ).length
  }, [allMessages, session?.id])

  useEffect(() => {
    getWorkers().then(res => { if (res.success) setDbWorkers(res.data || []) })
  }, [])

  // SSE: 作業員からのメッセージをリアルタイムで受け取る
  const refreshAdminMessages = useCallback(async () => {
    const result = await messagesApi.getMessages()
    if (result.success) {
      dispatch({ type: 'SET_MESSAGES', payload: result.data })
    }
  }, [dispatch])

  useServerEvents({
    enabled: !!session,
    onTokenExpired: () => logout(),
    onNewMessage: () => refreshAdminMessages(),
    onAssignmentStatusChanged: (data) => {
      window.dispatchEvent(new CustomEvent('fieldo:assignment-updated', { detail: data }))
    },
    onAttendanceStatusChanged: (data) => {
      window.dispatchEvent(new CustomEvent('fieldo:attendance-updated', { detail: data }))
    },
  })

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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{text.header.title}</h1>
            {session?.company_name && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                {session.company_name}
              </span>
            )}
          </div>
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
                  <AppIcon name={tab.icon} size={16} />
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


      {selectedTab === 'dashboard' && <DashboardPanel onNavigateToTeams={() => handleTabChange('teams')} />}
      {selectedTab === 'orders' && (
        <AdminPanel onAssignWorkers={handleAssignWorkers} workers={dbWorkers} />
      )}
      {selectedTab === 'messages' && <MessagePanel workers={dbWorkers} />}
      {selectedTab === 'reports' && <ReportsPanel />}
      {selectedTab === 'shifts' && <ShiftPanel />}
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
