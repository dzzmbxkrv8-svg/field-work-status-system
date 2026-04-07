import { ROLE_TABS } from '@/utils/constants'
import { useI18n } from '@/i18n'

export default function BottomNavigation({ selectedTab, onTabChange }) {
    const { text } = useI18n('ja')

    return (
        <nav className="fws-bottom-nav">
            {ROLE_TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`fws-bottom-nav-item ${selectedTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <span className="fws-bottom-nav-icon">{tab.icon}</span>
                    <span className="fws-bottom-nav-label">{text.tabs[tab.id]}</span>
                </button>
            ))}
        </nav>
    )
}
