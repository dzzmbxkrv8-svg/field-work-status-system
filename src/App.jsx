import LoginPage from '@/pages/LoginPage'
import WorkerPage from '@/pages/WorkerPage'
import AdminPage from '@/pages/AdminPage'
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
