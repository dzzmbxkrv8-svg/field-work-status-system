import { useState, useEffect } from 'react'
import { AppIcon } from '@/utils/iconMap'
import { getMyProfile, updateMyProfile } from '@/api/workers'

// 作業員本人が自分の連絡先・住所を編集するモーダル。
// スキルレベル・チーム所属・パスワードはここでは変更できない（管理者側の編集画面のみ）。
//
// ログインセッションには電話番号・メール・住所が含まれていないため、フォームの初期値は
// セッションを信用せず、開いた時点で必ずサーバーから最新値を取得する
// （そうしないと未取得の項目が空のまま保存され、既存の値が消えてしまう）。
export default function WorkerProfileModal({ worker, onClose, onSaved }) {
  const [name, setName] = useState(worker.name || '')
  const [furigana, setFurigana] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getMyProfile().then(res => {
      if (cancelled) return
      if (res.success) {
        setName(res.data.name || '')
        setFurigana(res.data.furigana || '')
        setPhone(res.data.phone || '')
        setEmail(res.data.email || '')
        setAddress(res.data.address || '')
      } else {
        setError(res.message || 'プロフィールの取得に失敗しました')
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setError('プロフィールの取得に失敗しました')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const fieldStyle = {
    padding: '0.55rem 0.75rem', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: '0.9rem',
    width: '100%', boxSizing: 'border-box', background: '#fafafa',
  }
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', color: '#374151' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return // 取得完了前に空値のまま送信してしまうのを防ぐ
    if (!name.trim()) { setError('氏名は必須です'); return }
    setError(null)
    setSaving(true)
    const res = await updateMyProfile({
      name: name.trim(),
      furigana: furigana.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
    })
    setSaving(false)
    if (res.success) {
      onSaved(res.data)
      onClose()
    } else {
      setError(res.message || '保存に失敗しました')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,14,46,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.25rem', borderBottom: '1px solid #f1f5f9',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f0e2e' }}>
            <AppIcon name="User" size={17} strokeWidth={2} />
            プロフィール編集
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: '1.4rem', lineHeight: 1, color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
          >
            &times;
          </button>
        </header>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', padding: '1.1rem 1.25rem 1.4rem' }}>
          {error && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.82rem', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
              {error}
            </p>
          )}
          {loading && (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>読み込み中...</p>
          )}
          <label style={labelStyle}>
            <span>氏名 <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>必須</span></span>
            <input value={name} onChange={e => setName(e.target.value)} disabled={loading} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            ふりがな
            <input value={furigana} onChange={e => setFurigana(e.target.value)} placeholder="やまだ たろう" disabled={loading} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            電話番号
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-0000-0000" disabled={loading} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            メールアドレス
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yamada@example.com" disabled={loading} style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            住所
            <div style={{ position: 'relative' }}>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="東京都渋谷区〇〇1-2-3" disabled={loading} style={{ ...fieldStyle, paddingRight: '2.2rem' }} />
              {address.trim() && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Googleマップで確認"
                  style={{
                    position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', color: '#4f46e5',
                  }}
                >
                  <AppIcon name="MapPin" size={16} strokeWidth={2} />
                </a>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              現場からの距離をもとにした自動アサインで使われます
            </span>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
              キャンセル
            </button>
            <button type="submit" disabled={saving || loading}
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: (saving || loading) ? 'not-allowed' : 'pointer' }}>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
