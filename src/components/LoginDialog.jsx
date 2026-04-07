import { useState } from 'react'
import { useI18n } from '@/i18n'

export default function LoginDialog({
  language,
  onLanguageChange,
  onWorkerLogin,
  onAdminLogin,
  onRegisterWorker,
  onWorkerReset,
  onRegisterOrganization,
  onAdminReset,
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
  const [adminRegisterOpen, setAdminRegisterOpen] = useState(false)
  const [adminResetOpen, setAdminResetOpen] = useState(false)

  const [workerRegisterState, setWorkerRegisterState] = useState({
    accessCode: '',
    name: '',
    team: '',
    password: '',
    confirm: '',
  })
  const [workerResetState, setWorkerResetState] = useState({ code: '', name: '', password: '', confirm: '' })
  const [adminRegisterState, setAdminRegisterState] = useState({
    company: '',
    adminName: '',
    password: '',
    confirm: '',
  })
  const [adminResetState, setAdminResetState] = useState({ code: '', password: '', confirm: '' })

  const resetPanels = () => {
    setError('')
    setInfo('')
    setWorkerRegisterOpen(false)
    setWorkerResetOpen(false)
    setAdminRegisterOpen(false)
    setAdminResetOpen(false)
  }

  const handleLanguageChange = (nextLanguage) => {
    resetPanels()
    onLanguageChange(nextLanguage)
  }

  const handleWorkerSubmit = () => {
    if (workerCode.trim().length === 0) {
      setError(text.login.errors.workerIdRequired)
      return
    }
    if (workerPassword.length === 0) {
      setError(text.login.errors.workerPasswordRequired)
      return
    }
    try {
      onWorkerLogin({ code: workerCode, password: workerPassword })
      setWorkerPassword('')
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidWorkerCredentials'
      setError(text.login.errors[messageKey] ?? text.login.errors.invalidWorkerCredentials)
    }
  }

  const handleAdminSubmit = () => {
    if (adminCode.trim().length === 0) {
      setError(text.login.errors.accessCodeRequired)
      return
    }
    if (adminPassword.length === 0) {
      setError(text.login.errors.adminPasswordRequired ?? text.login.errors.workerPasswordRequired)
      return
    }
    try {
      onAdminLogin({ code: adminCode, password: adminPassword })
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

  const handleWorkerRegisterSubmit = (event) => {
    event.preventDefault()
    setInfo('')
    if (!workerRegisterState.accessCode.trim()) {
      setInfo(text.login.errors.accessCodeRequired)
      return
    }
    if (!workerRegisterState.name.trim()) {
      setInfo(text.login.workerNameLabel)
      return
    }
    if (!workerRegisterState.team.trim()) {
      setInfo(text.login.workerTeamLabel)
      return
    }
    if (!workerRegisterState.password || workerRegisterState.password !== workerRegisterState.confirm) {
      setInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      onRegisterWorker({
        accessCode: workerRegisterState.accessCode,
        name: workerRegisterState.name,
        team: workerRegisterState.team,
        password: workerRegisterState.password,
      })
      setInfo(text.login.workerRegisterSuccess)
      setWorkerRegisterState({ accessCode: '', name: '', team: '', password: '', confirm: '' })
      setWorkerRegisterOpen(false)
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidAdmin'
      setInfo(text.login.errors[messageKey] ?? text.login.errors.invalidAdmin)
    }
  }

  const handleWorkerResetSubmit = (event) => {
    event.preventDefault()
    setInfo('')
    if (!workerResetState.code.trim()) {
      setInfo(text.login.errors.accessCodeRequired)
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
      onWorkerReset({
        accessCode: workerResetState.code,
        name: workerResetState.name,
        password: workerResetState.password,
      })
      setInfo(text.login.resetSuccess)
      setWorkerResetState({ code: '', name: '', password: '', confirm: '' })
      setWorkerResetOpen(false)
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidWorkerCredentials'
      setInfo(text.login.errors[messageKey] ?? text.login.errors.invalidWorkerCredentials)
    }
  }

  const handleAdminRegisterSubmit = (event) => {
    event.preventDefault()
    setInfo('')
    if (!adminRegisterState.company.trim()) {
      setInfo(text.login.errors.organizationNameRequired)
      return
    }
    if (!adminRegisterState.adminName.trim()) {
      setInfo(text.login.errors.workerIdRequired)
      return
    }
    if (!adminRegisterState.password || adminRegisterState.password !== adminRegisterState.confirm) {
      setInfo(text.login.errors.passwordMismatch)
      return
    }
    const record = onRegisterOrganization({
      companyName: adminRegisterState.company,
      adminName: adminRegisterState.adminName,
      password: adminRegisterState.password,
    })
    const message =
      typeof text.login.adminRegisterSuccess === 'function'
        ? text.login.adminRegisterSuccess(record.code)
        : text.login.adminRegisterSuccess
    setInfo(message)
    setAdminRegisterState({ company: '', adminName: '', password: '', confirm: '' })
    setAdminRegisterOpen(false)
  }

  const handleAdminResetSubmit = (event) => {
    event.preventDefault()
    setInfo('')
    if (!adminResetState.code.trim()) {
      setInfo(text.login.errors.accessCodeRequired)
      return
    }
    if (!adminResetState.password || adminResetState.password !== adminResetState.confirm) {
      setInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      onAdminReset({ code: adminResetState.code, password: adminResetState.password })
      setInfo(text.login.resetSuccess)
      setAdminResetState({ code: '', password: '', confirm: '' })
      setAdminResetOpen(false)
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidAdmin'
      setInfo(text.login.errors[messageKey] ?? text.login.errors.invalidAdmin)
    }
  }

  const registerLinkLabel = role === 'worker' ? text.login.workerRegisterTitle : text.login.adminRegisterTitle
  const resetLinkLabel = role === 'worker' ? text.login.forgotPassword : text.login.adminResetTitle

  return (
    <div className="fws-login-shell">
      <div className="fws-login-card">
        <header className="fws-login-header">
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
            Field Work Status System
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
                  {text.login.workerIdLabel} / {text.login.accessCodeLabel}
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
                  {text.login.accessCodeLabel}
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
          <div className="fws-login-links stacked">
            <button
              type="button"
              className="fws-link-button"
              onClick={() =>
                role === 'worker'
                  ? setWorkerRegisterOpen((value) => !value)
                  : setAdminRegisterOpen((value) => !value)
              }
            >
              {registerLinkLabel}
            </button>
            <button
              type="button"
              className="fws-link-button"
              onClick={() =>
                role === 'worker'
                  ? setWorkerResetOpen((value) => !value)
                  : setAdminResetOpen((value) => !value)
              }
            >
              {resetLinkLabel}
            </button>
          </div>
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
                {text.login.workerNameLabel}
                <input
                  value={workerRegisterState.name}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                {text.login.workerTeamLabel}
                <input
                  value={workerRegisterState.team}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, team: event.target.value }))}
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
                {text.login.resetWorkerIdLabel}
                <input
                  value={workerResetState.code}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, code: event.target.value }))}
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

        {adminRegisterOpen && (
          <div className="fws-reset-panel">
            <h3>{text.login.adminRegisterTitle}</h3>
            <p>{text.login.adminRegisterInstructions}</p>
            <form className="fws-login-grid" onSubmit={handleAdminRegisterSubmit}>
              <label>
                {text.login.adminCompanyLabel}
                <input
                  value={adminRegisterState.company}
                  onChange={(event) => setAdminRegisterState((prev) => ({ ...prev, company: event.target.value }))}
                />
              </label>
              <label>
                {text.login.adminContactLabel}
                <input
                  value={adminRegisterState.adminName}
                  onChange={(event) =>
                    setAdminRegisterState((prev) => ({ ...prev, adminName: event.target.value }))
                  }
                />
              </label>
              <label>
                {text.login.adminPasswordLabel}
                <input
                  type="password"
                  value={adminRegisterState.password}
                  onChange={(event) => setAdminRegisterState((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <label>
                {text.login.adminConfirmPasswordLabel}
                <input
                  type="password"
                  value={adminRegisterState.confirm}
                  onChange={(event) => setAdminRegisterState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  {text.login.adminRegisterSubmit}
                </button>
                <button type="button" className="fws-link-button" onClick={() => setAdminRegisterOpen(false)}>
                  {text.login.backToSignIn}
                </button>
              </div>
            </form>
          </div>
        )}

        {adminResetOpen && (
          <div className="fws-reset-panel">
            <h3>{text.login.adminResetTitle}</h3>
            <p>{text.login.adminResetInstructions}</p>
            <form className="fws-login-grid" onSubmit={handleAdminResetSubmit}>
              <label>
                {text.login.accessCodeLabel}
                <input
                  value={adminResetState.code}
                  onChange={(event) => setAdminResetState((prev) => ({ ...prev, code: event.target.value }))}
                />
              </label>
              <label>
                {text.login.resetNewPasswordLabel}
                <input
                  type="password"
                  value={adminResetState.password}
                  onChange={(event) => setAdminResetState((prev) => ({ ...prev, password: event.target.value }))}
                />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={adminResetState.confirm}
                  onChange={(event) => setAdminResetState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  {text.login.adminResetSubmit}
                </button>
                <button type="button" className="fws-link-button" onClick={() => setAdminResetOpen(false)}>
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
