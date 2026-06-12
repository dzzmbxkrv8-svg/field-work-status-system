import LoginPage from '@/pages/LoginPage'
import WorkerPage from '@/pages/WorkerPage'
import AdminPage from '@/pages/AdminPage'
import ResetConfirmPage from '@/pages/ResetConfirmPage'
import AdminInvitePage from '@/pages/AdminInvitePage'
import { useAppContext } from '@/contexts/AppContext'
import { useI18n } from '@/i18n'
import './App.css'

function AppRouter() {
  const { state } = useAppContext()
  const { session, language } = state
  const { text } = useI18n(language)

  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
    document.title = session?.role === 'worker' ? text.worker.title : text.header.title
  }

  // パスワードリセット確認URL (?reset_token=xxx) の処理
  const params = new URLSearchParams(window.location.search)
  const resetToken = params.get('reset_token')
  if (resetToken) {
    return <ResetConfirmPage token={resetToken} />
  }

  // 管理者招待URL (?admin_invite=xxx) の処理
  const adminInviteToken = params.get('admin_invite')
  if (adminInviteToken) {
    return <AdminInvitePage token={adminInviteToken} />
  }

  switch (session?.role) {
    case 'worker':
      return <WorkerPage />
    case 'admin':
      return <AdminPage />
    default:
      return <LoginPage />
  }
}

export default function App() {
  return <AppRouter />
}
