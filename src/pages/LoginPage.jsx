import LoginDialog from '@/components/LoginDialog'
import { useAppContext } from '@/contexts/AppContext'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { language, setLanguage } = useAppContext()
  const {
    loginWorker,
    loginAdmin,
    registerWorker,
    registerOrganization,
    resetWorkerPassword,
    resetAdminPassword,
  } = useAuth()

  return (
    <LoginDialog
      language={language}
      onLanguageChange={setLanguage}
      onWorkerLogin={loginWorker}
      onAdminLogin={loginAdmin}
      onRegisterWorker={registerWorker}
      onWorkerReset={resetWorkerPassword}
      onRegisterOrganization={registerOrganization}
      onAdminReset={resetAdminPassword}
    />
  )
}
