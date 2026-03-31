import { AppProvider } from '@/contexts/AppContext'

export function AppProviders({ children }) {
  return <AppProvider>{children}</AppProvider>
}
