import { useState } from 'react'
import { useI18n } from '@/i18n'

export default function LoginDialog({
  language,
  onLanguageChange,
  onWorkerLogin,
  onAdminLogin,
  onRegisterWorker,
  onWorkerReset,
}) {
  const { text } = useI18n()
  const [role, setRole] = useState('worker')
  const [workerCode, setWorkerCode] = useState('')
  const [workerPassword, setWorkerPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [workerRegisterOpen, setWorkerRegisterOpen] = useState(false)
  const [workerResetOpen, setWorkerResetOpen] = useState(false)

  const [workerRegisterState, setWorkerRegisterState] = useState({
    accessCode: '',
    employeeId: '',
    name: '',
    password: '',
    confirm: '',
  })
  const [workerResetState, setWorkerResetState] = useState({
    employeeId: '',
    name: '',
    password: '',
    confirm: '',
  })

  const resetPanels = () => {
    setError('')
    setInfo('')
    setWorkerRegisterOpen(false)
    setWorkerResetOpen(false)
  }

  const handleLanguageChange = (nextLanguage) => {
    resetPanels()
    onLanguageChange(nextLanguage)
  }

  const handleWorkerSubmit = async () => {
    if (workerCode.trim().length === 0) {
      setError(text.login.errors.workerIdRequired)
      return
    }
    if (workerPassword.length === 0) {
      setError(text.login.errors.workerPasswordRequired)
      return
    }
    try {
      await onWorkerLogin({ code: workerCode, password: workerPassword })
      setWorkerPassword('')
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidWorkerCredentials'
      setError(text.login.errors[messageKey] ?? text.login.errors.invalidWorkerCredentials)
    }
  }

  const handleAdminSubmit = async () => {
    if (adminCode.trim().length === 0) {
      setError(text.login.errors.accessCodeRequired)
      return
    }
    if (adminPassword.length === 0) {
      setError(text.login.errors.adminPasswordRequired ?? text.login.errors.workerPasswordRequired)
      return
    }
    try {
      await onAdminLogin({ code: adminCode, password: adminPassword })
      setAdminPassword('')
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidAdmin'
      setError(text.login.errors[messageKey] ?? text.login.errors.invalidAdmin)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    if (role === 'worker') {
      handleWorkerSubmit()
    } else {
      handleAdminSubmit()
    }
  }

  const handleWorkerRegisterSubmit = async (event) => {
    event.preventDefault()
    setInfo('')
    if (!workerRegisterState.accessCode.trim()) {
      setInfo(text.login.errors.accessCodeRequired)
      return
    }
    if (!workerRegisterState.employeeId.trim()) {
      setInfo(text.login.errors.workerIdRequired)
      return
    }
    if (!workerRegisterState.name.trim()) {
      setInfo(text.login.workerNameLabel)
      return
    }
    if (!workerRegisterState.password || workerRegisterState.password !== workerRegisterState.confirm) {
      setInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      await onRegisterWorker({
        accessCode: workerRegisterState.accessCode,
        employeeId: workerRegisterState.employeeId,
        name: workerRegisterState.name,
        password: workerRegisterState.password,
      })
      setInfo(text.login.workerRegisterSuccess)
      setWorkerRegisterState({ accessCode: '', employeeId: '', name: '', password: '', confirm: '' })
      setWorkerRegisterOpen(false)
    } catch (exception) {
      const messageKey = exception.code ?? 'unknownOrganization'
      setInfo(text.login.errors[messageKey] ?? text.login.errors.unknownOrganization ?? exception.message)
    }
  }

  const handleWorkerResetSubmit = async (event) => {
    event.preventDefault()
    setInfo('')
    if (!workerResetState.employeeId.trim()) {
      setInfo(text.login.errors.workerIdRequired)
      return
    }
    if (!workerResetState.name.trim()) {
      setInfo(text.login.workerNameLabel)
      return
    }
    if (!workerResetState.password || workerResetState.password !== workerResetState.confirm) {
      setInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      await onWorkerReset({
        employeeId: workerResetState.employeeId,
        name: workerResetState.name,
        password: workerResetState.password,
      })
      setInfo(text.login.resetSuccess)
      setWorkerResetState({ employeeId: '', name: '', password: '', confirm: '' })
      setWorkerResetOpen(false)
    } catch (exception) {
      const messageKey = exception.code ?? 'unknownWorker'
      setInfo(text.login.errors[messageKey] ?? text.login.errors.unknownWorker ?? exception.message)
    }
  }

  return (
    <div className="fws-login-shell">
      <div className="fws-login-card">
        <header className="fws-login-header">
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
            Fieldo
          </p>
          <h1>{text.login.title}</h1>
          <p>{text.login.subtitle}</p>
        </header>
        <div className="fws-role-toggle" role="radiogroup" aria-label={text.login.roleLabel}>
          <button
            type="button"
            className={role === 'worker' ? 'active' : ''}
            onClick={() => {
              if (role !== 'worker') {
                setRole('worker')
                resetPanels()
              }
            }}
          >
            {text.login.roleOptions.worker}
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'active' : ''}
            onClick={() => {
              if (role !== 'admin') {
                setRole('admin')
                resetPanels()
                handleLanguageChange('ja')
              }
            }}
          >
            {text.login.roleOptions.admin}
          </button>
        </div>

        <form className="fws-login-form" onSubmit={handleSubmit}>
          <div className="fws-login-grid">
            {role === 'worker' ? (
              <>
                <label>
                  {text.login.workerIdLabel}
                  <input value={workerCode} onChange={(event) => setWorkerCode(event.target.value)} />
                </label>
                <label>
                  {text.login.workerPasswordLabel}
                  <input
                    type="password"
                    value={workerPassword}
                    onChange={(event) => setWorkerPassword(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  {text.login.workerIdLabel}
                  <input value={adminCode} onChange={(event) => setAdminCode(event.target.value)} />
                </label>
                <label>
                  {text.login.workerPasswordLabel}
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          <p className="fws-login-hint">{role === 'admin' ? text.login.adminHint : text.login.workerHint}</p>
          {role === 'worker' && (
            <div className="fws-login-links stacked">
              <button
                type="button"
                className="fws-link-button"
                onClick={() => setWorkerRegisterOpen((v) => !v)}
              >
                {text.login.workerRegisterTitle}
              </button>
              <button
                type="button"
                className="fws-link-button"
                onClick={() => setWorkerResetOpen((v) => !v)}
              >
                {text.login.forgotPassword}
              </button>
            </div>
          )}
          {error && <p className="fws-login-error">{error}</p>}
          {info && <p className="fws-login-info">{info}</p>}
          <button type="submit" className="fws-button">
            {role === 'admin' ? text.login.submit.admin : text.login.submit.worker}
          </button>
        </form>

        {workerRegisterOpen && (
          <div className="fws-reset-panel">
            <h3>{text.login.workerRegisterTitle}</h3>
            <p>{text.login.workerRegisterInstructions}</p>
            <form className="fws-login-grid" onSubmit={handleWorkerRegisterSubmit}>
              <label>
                {text.login.accessCodeLabel}
                <input
                  value={workerRegisterState.accessCode}
                  onChange={(event) =>
                    setWorkerRegisterState((prev) => ({ ...prev, accessCode: event.target.value }))
                  }
                />
              </label>
              <label>
                {text.login.workerIdLabel}
                <input
                  value={workerRegisterState.employeeId}
                  onChange={(event) =>
                    setWorkerRegisterState((prev) => ({ ...prev, employeeId: event.target.value }))
                  }
                />
              </label>
              <label>
                {text.login.workerNameLabel}
                <input
                  value={workerRegisterState.name}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                {text.login.workerPasswordLabel}
                <input
                  type="password"
                  value={workerRegisterState.password}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={workerRegisterState.confirm}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  {text.login.workerRegisterSubmit}
                </button>
                <button type="button" className="fws-link-button" onClick={() => setWorkerRegisterOpen(false)}>
                  {text.login.backToSignIn}
                </button>
              </div>
            </form>
          </div>
        )}

        {workerResetOpen && (
          <div className="fws-reset-panel">
            <h3>{text.login.resetTitle}</h3>
            <p>{text.login.resetInstructions}</p>
            <form className="fws-login-grid" onSubmit={handleWorkerResetSubmit}>
              <label>
                {text.login.workerIdLabel}
                <input
                  value={workerResetState.employeeId}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, employeeId: event.target.value }))}
                />
              </label>
              <label>
                {text.login.workerNameLabel}
                <input
                  value={workerResetState.name}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                {text.login.resetNewPasswordLabel}
                <input
                  type="password"
                  value={workerResetState.password}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={workerResetState.confirm}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  {text.login.resetSubmit}
                </button>
                <button type="button" className="fws-link-button" onClick={() => setWorkerResetOpen(false)}>
                  {text.login.backToSignIn}
                </button>
              </div>
            </form>
          </div>
        )}

        {role === 'worker' && (
          <div className="fws-login-language">
            <label htmlFor="fws-login-language">{text.languageLabel}</label>
            <select
              id="fws-login-language"
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value)}
              className="fws-login-language-select"
            >
              {Object.entries(text.languages).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
