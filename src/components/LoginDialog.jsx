import { useState } from 'react'
import { useI18n } from '@/i18n'

/** パスワード強度チェック */
function checkPassword(pw) {
  return {
    length:    pw.length >= 8,
    lower:     /[a-z]/.test(pw),
    upper:     /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
  }
}
function isPasswordValid(pw) {
  const r = checkPassword(pw)
  return r.length && r.lower && r.upper && r.number
}

function PasswordStrength({ password }) {
  if (!password) return null
  const r = checkPassword(password)
  const rules = [
    { key: 'length', label: '8文字以上' },
    { key: 'lower',  label: '小文字を含む' },
    { key: 'upper',  label: '大文字を含む' },
    { key: 'number', label: '数字を含む' },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem 0.6rem', marginTop: '0.4rem' }}>
      {rules.map(({ key, label }) => (
        <span key={key} style={{
          fontSize: '0.72rem', fontWeight: 600,
          color: r[key] ? '#059669' : '#94a3b8',
          display: 'flex', alignItems: 'center', gap: '0.2rem',
        }}>
          {r[key] ? '✓' : '○'} {label}
        </span>
      ))}
    </div>
  )
}

export default function LoginDialog({
  language,
  onLanguageChange,
  onWorkerLogin,
  onAdminLogin,
  onRegisterWorker,
  onRegisterCompany,
  onWorkerReset,
}) {
  const { text } = useI18n()
  const [role, setRole] = useState('worker')
  // Remember Me: localStorage から ID・パスワードを復元
  const [workerCode, setWorkerCode] = useState(() => localStorage.getItem('remembered_worker_id') || '')
  const [workerPassword, setWorkerPassword] = useState(() => localStorage.getItem('remembered_worker_password') || '')
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_worker_id'))
  const [adminCode, setAdminCode] = useState(() => localStorage.getItem('remembered_admin_email') || '')
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('remembered_admin_password') || '')
  const [adminRememberMe, setAdminRememberMe] = useState(() => !!localStorage.getItem('remembered_admin_email'))
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [workerRegisterOpen, setWorkerRegisterOpen] = useState(false)
  const [workerResetOpen, setWorkerResetOpen] = useState(false)
  const [workerRegisterInfo, setWorkerRegisterInfo] = useState('')
  const [workerResetInfo, setWorkerResetInfo] = useState('')
  const [companyRegisterOpen, setCompanyRegisterOpen] = useState(false)
  const [companyRegisterDone, setCompanyRegisterDone] = useState(false)
  const [companyRegisterInfo, setCompanyRegisterInfo] = useState('')

  const [workerRegisterState, setWorkerRegisterState] = useState({
    accessCode: '',
    furigana: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [workerResetState, setWorkerResetState] = useState({
    employeeId: '',
    name: '',
    password: '',
    confirm: '',
  })
  const [companyRegisterState, setCompanyRegisterState] = useState({
    companyName: '',
    furigana: '',
    adminName: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  })

  const resetPanels = () => {
    setError('')
    setInfo('')
    setWorkerRegisterOpen(false)
    setWorkerResetOpen(false)
    setCompanyRegisterOpen(false)
    setCompanyRegisterDone(false)
  }

  const isKatakana = (str) => /^[゠-ヿ\s　]+$/.test(str.trim())

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
      // Remember Me の保存・削除
      if (rememberMe) {
        localStorage.setItem('remembered_worker_id', workerCode)
        localStorage.setItem('remembered_worker_password', workerPassword)
      } else {
        localStorage.removeItem('remembered_worker_id')
        localStorage.removeItem('remembered_worker_password')
      }
      setWorkerPassword('')
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidWorkerCredentials'
      setError(text.login.errors[messageKey] ?? text.login.errors.invalidWorkerCredentials)
    }
  }

  const handleAdminSubmit = async () => {
    if (adminCode.trim().length === 0) {
      setError('メールアドレスを入力してください')
      return
    }
    if (adminPassword.length === 0) {
      setError(text.login.errors.adminPasswordRequired ?? text.login.errors.workerPasswordRequired)
      return
    }
    try {
      if (adminRememberMe) {
        localStorage.setItem('remembered_admin_email', adminCode.trim())
        localStorage.setItem('remembered_admin_password', adminPassword)
      } else {
        localStorage.removeItem('remembered_admin_email')
        localStorage.removeItem('remembered_admin_password')
      }
      await onAdminLogin({ code: adminCode, password: adminPassword })
      setAdminPassword('')
    } catch (exception) {
      const messageKey = exception.code ?? 'invalidAdmin'
      setError(text.login.errors[messageKey] ?? exception.message ?? text.login.errors.invalidAdmin)
    }
  }

  const handleCompanyRegisterSubmit = async (event) => {
    event.preventDefault()
    setCompanyRegisterInfo('')
    if (!companyRegisterState.companyName.trim()) {
      setCompanyRegisterInfo('会社名を入力してください')
      return
    }
    if (!companyRegisterState.adminName.trim()) {
      setCompanyRegisterInfo('管理者の氏名を入力してください')
      return
    }
    if (!companyRegisterState.furigana.trim()) {
      setCompanyRegisterInfo('フリガナを入力してください')
      return
    }
    if (!isKatakana(companyRegisterState.furigana)) {
      setCompanyRegisterInfo('フリガナはカタカナで入力してください')
      return
    }
    if (!companyRegisterState.email.trim()) {
      setCompanyRegisterInfo('メールアドレスを入力してください')
      return
    }
    if (!companyRegisterState.password || !isPasswordValid(companyRegisterState.password)) {
      setCompanyRegisterInfo('パスワードは大文字・小文字・数字を含む8文字以上で設定してください')
      return
    }
    if (companyRegisterState.password !== companyRegisterState.confirm) {
      setCompanyRegisterInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      await onRegisterCompany({
        companyName: companyRegisterState.companyName,
        adminName: companyRegisterState.adminName,
        furigana: companyRegisterState.furigana,
        phone: companyRegisterState.phone,
        email: companyRegisterState.email,
        password: companyRegisterState.password,
      })
      setCompanyRegisterState({ companyName: '', furigana: '', adminName: '', phone: '', email: '', password: '', confirm: '' })
      setCompanyRegisterInfo('')
      setCompanyRegisterOpen(false)
      setCompanyRegisterDone(true)
    } catch (exception) {
      setCompanyRegisterInfo(exception.message || 'エラーが発生しました。しばらく待ってから再試行してください。')
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
    setWorkerRegisterInfo('')
    if (!workerRegisterState.accessCode.trim()) {
      setWorkerRegisterInfo(text.login.errors.accessCodeRequired)
      return
    }
    if (!workerRegisterState.name.trim()) {
      setWorkerRegisterInfo(text.login.workerNameLabel)
      return
    }
    if (!workerRegisterState.password || !isPasswordValid(workerRegisterState.password)) {
      setWorkerRegisterInfo('パスワードは大文字・小文字・数字を含む8文字以上で設定してください')
      return
    }
    if (workerRegisterState.password !== workerRegisterState.confirm) {
      setWorkerRegisterInfo(text.login.errors.passwordMismatch)
      return
    }
    if (!workerRegisterState.furigana.trim()) {
      setWorkerRegisterInfo('フリガナを入力してください')
      return
    }
    if (!isKatakana(workerRegisterState.furigana)) {
      setWorkerRegisterInfo('フリガナはカタカナで入力してください')
      return
    }
    try {
      const result = await onRegisterWorker({
        accessCode: workerRegisterState.accessCode,
        furigana: workerRegisterState.furigana,
        name: workerRegisterState.name,
        phone: workerRegisterState.phone,
        email: workerRegisterState.email,
        password: workerRegisterState.password,
      })
      const assignedId = result?.employeeId || result?.data?.employee_id
      setWorkerRegisterInfo(assignedId
        ? `登録が完了しました。あなたの作業員IDは「${assignedId}」です。\n管理者の承認後にログインできるようになります。`
        : text.login.workerRegisterSuccess
      )
      setWorkerRegisterState({ accessCode: '', furigana: '', name: '', phone: '', email: '', password: '', confirm: '' })
    } catch (exception) {
      const messageKey = exception.code ?? 'unknownOrganization'
      setWorkerRegisterInfo(text.login.errors[messageKey] ?? text.login.errors.unknownOrganization ?? exception.message)
    }
  }

  const handleWorkerResetSubmit = async (event) => {
    event.preventDefault()
    setWorkerResetInfo('')
    if (!workerResetState.employeeId.trim()) {
      setWorkerResetInfo('メールアドレスを入力してください')
      return
    }
    if (!workerResetState.password || !isPasswordValid(workerResetState.password)) {
      setWorkerResetInfo('パスワードは大文字・小文字・数字を含む8文字以上で設定してください')
      return
    }
    if (workerResetState.password !== workerResetState.confirm) {
      setWorkerResetInfo(text.login.errors.passwordMismatch)
      return
    }
    try {
      await onWorkerReset({
        email: workerResetState.employeeId,
        password: workerResetState.password,
      })
      setWorkerResetInfo('確認メールを送信しました。メールに記載のURLをクリックしてパスワードを更新してください。')
      setWorkerResetState({ employeeId: '', name: '', password: '', confirm: '' })
    } catch (exception) {
      setWorkerResetInfo(exception.message || 'エラーが発生しました。しばらく待ってから再試行してください。')
    }
  }

  return (
    <div className="fws-login-shell">
      <div className="fws-login-card">
        <header className="fws-login-header">
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4f46e5', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 0.3rem' }}>
            Fieldo
          </p>
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
                  メールアドレス
                  <input
                    type="email"
                    placeholder="例：tanaka@example.com"
                    value={workerCode}
                    onChange={(event) => setWorkerCode(event.target.value)}
                    autoComplete="email"
                  />
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
                  メールアドレス
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="例：yamada@example.com"
                    value={adminCode}
                    onChange={(event) => setAdminCode(event.target.value)}
                  />
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
          <label style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center',
            gap: '0.5rem', cursor: 'pointer',
            fontSize: '0.85rem', color: '#475569', fontWeight: 500,
            textTransform: 'none', letterSpacing: 0,
            width: '100%', justifyContent: 'flex-start',
          }}>
            <input
              type="checkbox"
              checked={role === 'worker' ? rememberMe : adminRememberMe}
              onChange={e => role === 'worker'
                ? setRememberMe(e.target.checked)
                : setAdminRememberMe(e.target.checked)
              }
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#4f46e5', flexShrink: 0 }}
            />
            ログイン情報を保存する
          </label>
          {error && <p className="fws-login-error">{error}</p>}
          {info && <p className="fws-login-info">{info}</p>}
          <button type="submit" className="fws-button">
            {role === 'admin' ? text.login.submit.admin : text.login.submit.worker}
          </button>
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
          {role === 'admin' && (
            <div className="fws-login-links stacked">
              <button
                type="button"
                className="fws-link-button"
                onClick={() => setCompanyRegisterOpen((v) => !v)}
              >
                会社の新規登録（管理者の方）
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
                フリガナ
                <input
                  value={workerRegisterState.furigana}
                  placeholder="例：タナカタロウ"
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, furigana: event.target.value }))}
                />
              </label>
              <label>
                {text.login.workerNameLabel}（漢字）
                <input
                  value={workerRegisterState.name}
                  placeholder="例：田中太郎"
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, name: event.target.value }))}
                />
              </label>
              <label>
                電話番号
                <input
                  type="tel"
                  value={workerRegisterState.phone}
                  placeholder="例：090-1234-5678"
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label>
                メールアドレス
                <input
                  type="email"
                  value={workerRegisterState.email}
                  placeholder="例：tanaka@example.com"
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label>
                {text.login.workerPasswordLabel}
                <input
                  type="password"
                  value={workerRegisterState.password}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, password: event.target.value }))}
                />
                <PasswordStrength password={workerRegisterState.password} />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={workerRegisterState.confirm}
                  onChange={(event) => setWorkerRegisterState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              {workerRegisterInfo && (
                <p className="fws-login-info" style={{
                  color: workerRegisterInfo.includes('完了') ? '#059669' : '#dc2626',
                  whiteSpace: 'pre-line',
                }}>{workerRegisterInfo}</p>
              )}
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

        {companyRegisterDone && (
          <div className="fws-reset-panel" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</div>
            <h3 style={{ marginBottom: '0.5rem' }}>登録申請を受け付けました</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              ご登録のメールアドレスに確認メールをお送りしました。<br />
              Fieldo運営の審査・承認後、アクセスコードとログイン案内をお送りします。<br />
              しばらくお待ちください。
            </p>
            <button
              type="button"
              className="fws-link-button"
              onClick={() => setCompanyRegisterDone(false)}
            >
              ログイン画面に戻る
            </button>
          </div>
        )}

        {companyRegisterOpen && (
          <div className="fws-reset-panel">
            <h3>会社の新規登録</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.5rem' }}>
              会社情報と管理者情報を入力してください。Fieldo運営の承認後、
              アクセスコードとログインのご案内をメールでお送りします。
            </p>
            <form className="fws-login-grid" onSubmit={handleCompanyRegisterSubmit}>
              <label>
                会社名
                <input
                  value={companyRegisterState.companyName}
                  placeholder="例：株式会社フィールド工業"
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, companyName: event.target.value }))}
                />
              </label>
              <label>
                フリガナ（管理者）
                <input
                  value={companyRegisterState.furigana}
                  placeholder="例：ヤマダイチロウ"
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, furigana: event.target.value }))}
                />
              </label>
              <label>
                管理者氏名（漢字）
                <input
                  value={companyRegisterState.adminName}
                  placeholder="例：山田一郎"
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, adminName: event.target.value }))}
                />
              </label>
              <label>
                電話番号
                <input
                  type="tel"
                  value={companyRegisterState.phone}
                  placeholder="例：090-1234-5678"
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label>
                メールアドレス
                <input
                  type="email"
                  value={companyRegisterState.email}
                  placeholder="例：yamada@example.com"
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label>
                パスワード
                <input
                  type="password"
                  value={companyRegisterState.password}
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, password: event.target.value }))}
                />
                <PasswordStrength password={companyRegisterState.password} />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={companyRegisterState.confirm}
                  onChange={(event) => setCompanyRegisterState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              {companyRegisterInfo && (
                <p className="fws-login-info" style={{ color: '#dc2626' }}>{companyRegisterInfo}</p>
              )}
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  登録を申請する
                </button>
                <button type="button" className="fws-link-button" onClick={() => setCompanyRegisterOpen(false)}>
                  {text.login.backToSignIn}
                </button>
              </div>
            </form>
          </div>
        )}

        {workerResetOpen && (
          <div className="fws-reset-panel">
            <h3>パスワードを再設定する</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.5rem' }}>
              登録済みのメールアドレスと新しいパスワードを入力してください。確認メールが届きます。
            </p>
            <form className="fws-login-grid" onSubmit={handleWorkerResetSubmit}>
              <label>
                メールアドレス
                <input
                  type="email"
                  placeholder="例：tanaka@example.com"
                  value={workerResetState.employeeId}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, employeeId: event.target.value }))}
                />
              </label>
              <label>
                新しいパスワード
                <input
                  type="password"
                  value={workerResetState.password}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, password: event.target.value }))}
                />
                <PasswordStrength password={workerResetState.password} />
              </label>
              <label>
                {text.login.resetConfirmPasswordLabel}
                <input
                  type="password"
                  value={workerResetState.confirm}
                  onChange={(event) => setWorkerResetState((prev) => ({ ...prev, confirm: event.target.value }))}
                />
              </label>
              {workerResetInfo && (
                <p className="fws-login-info" style={{
                  color: workerResetInfo.includes('送信しました') ? '#059669' : '#dc2626',
                  whiteSpace: 'pre-line',
                }}>{workerResetInfo}</p>
              )}
              <div className="fws-reset-actions">
                <button type="submit" className="fws-button secondary">
                  確認メールを送信する
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
