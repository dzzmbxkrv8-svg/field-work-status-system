import { AppIcon } from '@/utils/iconMap'

export default function WorkerBottomNav({ activeTab, setActiveTab, text, incomingMessages }) {
  const unreadCount = incomingMessages.filter(m => !m.isRead).length

  const tabs = [
    { id: 'home',     icon: 'Home',     label: text.worker.navHome },
    { id: 'calendar', icon: 'Calendar', label: text.worker.navCalendar },
    { id: 'messages',   icon: 'Send',     label: text.worker.navReport },
  ]

  return (
    <nav className="worker-bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`worker-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          style={{ position: 'relative' }}
        >
          <span className="worker-nav-icon">
            <AppIcon name={tab.icon} size={22} strokeWidth={1.8} />
          </span>
          {tab.id === 'messages' && unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '6px', left: '50%', transform: 'translateX(6px)',
              background: '#ef4444', color: '#fff',
              borderRadius: '999px', fontSize: '0.6rem', fontWeight: 'bold',
              minWidth: '15px', height: '15px', lineHeight: '15px',
              textAlign: 'center', padding: '0 3px',
            }}>
              {unreadCount}
            </span>
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
