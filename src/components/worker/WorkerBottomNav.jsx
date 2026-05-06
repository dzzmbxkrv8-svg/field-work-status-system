export default function WorkerBottomNav({ activeTab, setActiveTab, text, incomingMessages }) {
  const unreadCount = incomingMessages.filter(m => !m.isRead).length

  return (
    <nav className="worker-bottom-nav">
      <button type="button" className={`worker-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
        🏠<span>{text.worker.navHome}</span>
      </button>
      <button type="button" className={`worker-nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
        📅<span>{text.worker.navCalendar}</span>
      </button>
      <button
        type="button"
        className={`worker-nav-item ${activeTab === 'report' ? 'active' : ''}`}
        onClick={() => setActiveTab('report')}
        style={{ position: 'relative' }}
      >
        ✉️
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '12px',
            background: '#ef4444', color: '#fff',
            borderRadius: '999px', fontSize: '0.65rem', fontWeight: 'bold',
            minWidth: '16px', height: '16px', lineHeight: '16px',
            textAlign: 'center', padding: '0 3px',
          }}>
            {unreadCount}
          </span>
        )}
        <span>{text.worker.navReport}</span>
      </button>
    </nav>
  )
}
