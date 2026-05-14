import { ROLE_TABS } from '@/utils/constants'
import { useI18n } from '@/i18n'
import { AppIcon } from '@/utils/iconMap'

export default function BottomNavigation({ selectedTab, onTabChange, unreadMessages = 0 }) {
    const { text } = useI18n()

    return (
        <nav className="fws-bottom-nav">
            {ROLE_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`fws-bottom-nav-item ${selectedTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                    style={{ position: 'relative' }}
                >
                    <span className="fws-bottom-nav-icon"><AppIcon name={tab.icon} size={20} strokeWidth={1.8} /></span>
                    <span className="fws-bottom-nav-label">{text.tabs[tab.id]}</span>
                    {tab.id === 'messages' && unreadMessages > 0 && (
                        <span style={{
                            position: 'absolute', top: 4, right: '50%', transform: 'translateX(14px)',
                            background: '#ef4444', color: '#fff',
                            borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
                            minWidth: 16, height: 16, lineHeight: '16px',
                            textAlign: 'center', padding: '0 3px',
                        }}>
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                    )}
                </button>
            ))}
        </nav>
    )
}
