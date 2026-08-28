import { TERMS_OF_SERVICE } from '@/legal/termsOfService'
import { PRIVACY_POLICY } from '@/legal/privacyPolicy'

const DOCS = {
  terms: { title: '利用規約', body: TERMS_OF_SERVICE },
  privacy: { title: 'プライバシーポリシー', body: PRIVACY_POLICY },
}

// 利用規約・プライバシーポリシーを表示するモーダル。
// ※ 表示内容はAIによる下書きであり、法的な正式文書として運用する前に
//    必ず専門家のレビューを受けてください（本文冒頭にも明記しています）。
export default function LegalDocumentModal({ doc, onClose }) {
  const content = DOCS[doc]
  if (!content) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,14,46,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto',
          background: '#fff', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.25rem', borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: '#fff',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f0e2e' }}>{content.title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: '1.4rem', lineHeight: 1, color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
          >
            &times;
          </button>
        </header>
        <div style={{ padding: '1.1rem 1.25rem 1.5rem' }}>
          <p style={{
            margin: '0 0 1rem', fontSize: '0.75rem', color: '#92400e',
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '0.6rem 0.8rem', lineHeight: 1.6,
          }}>
            この文書はAIによる下書きです。正式な法的文書として運用する前に、
            必ず弁護士等の専門家によるレビューを受けてください。
          </p>
          <pre style={{
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: 'inherit', fontSize: '0.82rem', color: '#374151', lineHeight: 1.8,
          }}>
            {content.body}
          </pre>
        </div>
      </div>
    </div>
  )
}
