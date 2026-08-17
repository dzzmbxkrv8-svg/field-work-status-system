import { useState, useEffect, useCallback, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useAppContext } from '@/contexts/AppContext'
import { defaultFormState } from '@/utils/constants'
import { formatAdminDate } from '@/utils/format'
import WorkOrdersTable from './WorkOrdersTable'
import { getAssignments, createAssignment, updateAssignment, cancelAssignment, assignWorker, setMembers, uploadAttachments } from '@/api/assignments'
import CreateOrderWizard from './CreateOrderWizard'
import EditOrderDialog from './EditOrderDialog'
import { AppIcon } from '@/utils/iconMap'


export default function AdminPanel({ onAssignWorkers, workers = [] }) {
  const { state } = useAppContext()
  const { text, getStatusLabel } = useI18n(state.language)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [isAdding, setIsAdding] = useState(false)
  const [notification, setNotification] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [completedSearch, setCompletedSearch] = useState('')
  const [completedVisibleCount, setCompletedVisibleCount] = useState(10)

  const showNotification = (type, text, duration = 3500) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), duration)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAssignments()
      if (result.success) {
        setOrders(result.data.map(o => ({
          ...o,
          id: o.assignment_code || o.id,
          db_id: o.id,
          projectName: o.title,
          location: o.location,
          team: o.team_name || `Team ${o.team_id}`,
          supervisor: o.supervisor_name || '—',
          status: o.status,
          crewCount: o.crew_count || 1,
          startDate: o.start_date,
          endDate: o.end_date,
          dueDate: o.end_date || o.start_date,
          progress: o.status === 'completed' ? 100 : (o.status === 'in_progress' ? 50 : 0),
          updatedAt: o.updated_at || o.created_at,
          assignedWorkerName: o.assigned_worker_name || null,
        })))
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
      setError('データを取得できませんでした')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    // 作業員が案件のステータスを変更した際、開きっぱなしの画面にも即時反映する
    // （DashboardPanel/ReportsPanel/AttendancePanelと同じ配線）
    const handleAssignmentUpdated = () => fetchOrders()
    window.addEventListener('fieldo:assignment-updated', handleAssignmentUpdated)
    return () => {
      window.removeEventListener('fieldo:assignment-updated', handleAssignmentUpdated)
    }
  }, [fetchOrders])

  const handleFormChange = (field, value) => {
    setFormState((previous) => ({ ...previous, [field]: value }))
  }

  const handleWizardCreate = async ({ title, location, startDate, dueDate, leaderId, memberIds, attachments }) => {
    // leaderまたは最初のメンバーのteam_idを使用、なければnull
    const leaderWorker = workers.find(w => w.id === leaderId)
    const firstMemberWorker = memberIds?.length > 0 ? workers.find(w => w.id === memberIds[0]) : null
    const resolvedTeamId = leaderWorker?.team_id ?? firstMemberWorker?.team_id ?? null

    const result = await createAssignment({
      assignment_code: `FW-${Date.now().toString().slice(-4)}`,
      title,
      location,
      team_id: resolvedTeamId,
      start_date: startDate,
      end_date: dueDate,
      status: 'pending',
    })

    if (!result.success) {
      showNotification('error', result.message || '作業指示の作成に失敗しました。')
      throw new Error(result.message)
    }

    const newId = result.data?.id
    if (newId) {
      if (leaderId) {
        await assignWorker(newId, leaderId)
      }
      if (memberIds && memberIds.length > 0) {
        await setMembers(newId, memberIds)
      }
      if (attachments && attachments.length > 0) {
        const uploadResult = await uploadAttachments(newId, attachments)
        if (!uploadResult.success) {
          showNotification('error', `作業指示は作成しましたが、ファイルのアップロードに失敗しました: ${uploadResult.message}`)
        }
      }
    }

    setIsAdding(false)
    fetchOrders()
    showNotification('success', '作業指示を作成しました。')
  }

  const handleEdit = async (dbId, data, newFiles) => {
    const result = await updateAssignment(dbId, data)
    if (!result.success) {
      showNotification('error', result.message || '更新に失敗しました。')
      throw new Error(result.message)
    }
    if (newFiles && newFiles.length > 0) {
      const uploadResult = await uploadAttachments(dbId, newFiles)
      if (!uploadResult.success) {
        showNotification('error', `作業指示は更新しましたが、ファイルのアップロードに失敗しました: ${uploadResult.message}`)
      }
    }
    setEditingOrder(null)
    fetchOrders()
    showNotification('success', '作業指示を更新しました。')
  }

  const handleCancel = async (order) => {
    if (!window.confirm(`「${order.projectName || order.id}」をキャンセルしますか？`)) return
    const result = await cancelAssignment(order.db_id || order.id)
    if (result.success) {
      fetchOrders()
      showNotification('success', 'キャンセルしました。')
    } else {
      showNotification('error', result.message || 'キャンセルに失敗しました。')
    }
  }

  // 進行中・未着手と完了済みを分離
  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'), [orders])
  const completedOrders = useMemo(() =>
    orders
      .filter(o => o.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
  [orders])

  // 案件名・場所・チーム名で絞り込み（大文字小文字を区別しない）
  const filteredCompletedOrders = useMemo(() => {
    const q = completedSearch.trim().toLowerCase()
    if (!q) return completedOrders
    return completedOrders.filter(o =>
      [o.projectName, o.id, o.location, o.team]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(q))
    )
  }, [completedOrders, completedSearch])

  // 検索条件が変わったら表示件数をリセット（絞り込み直後に「もっと見る」の状態が残らないように）
  useEffect(() => {
    setCompletedVisibleCount(10)
  }, [completedSearch])

  const visibleCompletedOrders = filteredCompletedOrders.slice(0, completedVisibleCount)

  if (loading && orders.length === 0) return <div className="fws-panel"><p>読み込み中...</p></div>
  if (error && orders.length === 0) return <div className="fws-panel"><p className="fws-accent">{error}</p></div>

  return (
    <section className="fws-panel">
        {notification && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem',
            background: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: notification.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <AppIcon name={notification.type === 'success' ? 'CircleCheck' : 'CircleX'} size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
            {notification.text}
          </div>
        )}
        <header className="fws-panel-header">
          <div>
            <h3>{text.admin.title}</h3>
            <p>{text.admin.description}</p>
          </div>
        </header>

        <div style={{ marginBottom: '1rem' }}>
          {!isAdding ? (
            <button type="button" className="fws-button" onClick={() => setIsAdding(true)}>
              {text.admin.addOrder}
            </button>
          ) : (
            <CreateOrderWizard
              workers={workers}
              onCreate={handleWizardCreate}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </div>

        {/* 編集ダイアログ */}
        {editingOrder && (
          <EditOrderDialog
            order={editingOrder}
            onSave={handleEdit}
            onCancel={() => setEditingOrder(null)}
          />
        )}

        {/* 進行中・未着手の案件 */}
        <WorkOrdersTable
          orders={activeOrders}
          onCancel={handleCancel}
          onAssignWorkers={onAssignWorkers}
          onEdit={setEditingOrder}
        />

        {/* 完了済み案件（折りたたみ） */}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setShowCompleted(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: 700, color: '#475569',
              padding: '0.4rem 0', width: '100%',
            }}
          >
            <AppIcon
              name="ChevronRight"
              size={14} strokeWidth={2}
              style={{ transition: 'transform 0.2s', transform: showCompleted ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
            />
            完了済み案件
            <span style={{
              marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 700,
              background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
              borderRadius: '999px', padding: '0.1rem 0.5rem',
            }}>
              {completedOrders.length}件
            </span>
          </button>

          {showCompleted && (
            <div style={{ marginTop: '0.75rem' }}>
              {completedOrders.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>完了した案件はありません</p>
              ) : (
                <>
                  <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <AppIcon name="Search" size={14} strokeWidth={2} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={completedSearch}
                      onChange={e => setCompletedSearch(e.target.value)}
                      placeholder="案件名・場所・チーム名で検索"
                      style={{
                        width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', borderRadius: 8,
                        border: '1px solid #e2e8f0', fontSize: '0.85rem', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {filteredCompletedOrders.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>「{completedSearch}」に一致する完了済み案件はありません</p>
                  ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {visibleCompletedOrders.map(order => (
                    <div key={order.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.65rem 0.9rem',
                      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                      gap: '1rem',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#14532d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.projectName || order.id}
                        </p>
                        {order.location && (
                          <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <AppIcon name="MapPin" size={11} strokeWidth={2} />{order.location}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {order.assignedWorkerName && (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                            <AppIcon name="User" size={11} strokeWidth={2} />{order.assignedWorkerName}
                          </p>
                        )}
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                          {formatAdminDate(order.updatedAt)} 完了
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredCompletedOrders.length > visibleCompletedOrders.length && (
                    <button
                      type="button"
                      className="fws-button tertiary"
                      onClick={() => setCompletedVisibleCount(c => c + 10)}
                      style={{ alignSelf: 'center', fontSize: '0.8rem' }}
                    >
                      もっと見る（残り{filteredCompletedOrders.length - visibleCompletedOrders.length}件）
                    </button>
                  )}
                </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
    </section>
  )
}
