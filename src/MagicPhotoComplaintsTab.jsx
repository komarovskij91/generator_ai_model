import { useCallback, useEffect, useState } from 'react'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('ru-RU')
}

function ComplaintCard({ item, busyId, onAction }) {
  const tags = Array.isArray(item.complaint_tags) ? item.complaint_tags : []
  const tokenCost = Number(item.token_cost || 0)
  const bonus = Math.floor(tokenCost / 2)
  const isBusy = busyId === item.id

  return (
    <article className="complaintCard">
      <img src={item.image_url || ''} alt="Magic photo complaint" loading="lazy" />
      <div className="complaintMeta">
        <strong>{item.model_name || item.model_id || 'Model'}</strong>
        <span className="fieldHint">{formatDate(item.complaint_submitted_at || item.created_at)}</span>
        <span className="fieldHint">user: {item.user_id || '—'}</span>
        <span className="fieldHint">cost: {tokenCost} tokens</span>
        <div>
          <strong>Prompt</strong>
          <div className="fieldHint">{item.prompt || '—'}</div>
        </div>
        {item.complaint_comment ? (
          <div>
            <strong>Комментарий</strong>
            <div className="fieldHint">{item.complaint_comment}</div>
          </div>
        ) : null}
        {tags.length > 0 && (
          <div className="complaintTags">
            {tags.map((tag) => (
              <span key={tag} className="complaintTag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="complaintActions">
        <button
          type="button"
          className="primary"
          disabled={isBusy}
          onClick={() => onAction(item.id, 'approve')}
        >
          Вернуть {tokenCost} + {bonus}
        </button>
        <button type="button" disabled={isBusy} onClick={() => onAction(item.id, 'reject')}>
          Отменить претензию (+{bonus})
        </button>
      </div>
    </article>
  )
}

export default function MagicPhotoComplaintsTab({ adminFetch, isActive, onCountChange }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState('')

  const refreshBadge = useCallback(async () => {
    try {
      const response = await adminFetch('/admin/magic-photo/complaints/count')
      const data = await response.json()
      onCountChange?.(Number(data.count || 0))
    } catch {
      onCountChange?.(0)
    }
  }, [adminFetch, onCountChange])

  const loadComplaints = useCallback(async () => {
    setStatus('Загрузка...')
    try {
      const response = await adminFetch('/admin/magic-photo/complaints?limit=100')
      const data = await response.json()
      const nextItems = Array.isArray(data.items) ? data.items : []
      setItems(nextItems)
      setStatus(`${nextItems.length} открытых`)
      await refreshBadge()
    } catch (error) {
      setItems([])
      setStatus('Ошибка загрузки')
    }
  }, [adminFetch, refreshBadge])

  const handleAction = useCallback(
    async (generationId, action) => {
      setBusyId(generationId)
      try {
        const response = await adminFetch(
          `/admin/magic-photo/complaints/${encodeURIComponent(generationId)}/${action}`,
          { method: 'POST' }
        )
        const data = await response.json()
        setStatus(
          action === 'approve'
            ? `Возвращено ${data.credited_tokens || 0} tokens`
            : `Компенсация ${data.credited_tokens || 0} tokens`
        )
        await loadComplaints()
      } catch (error) {
        setStatus(error.message || 'Ошибка действия')
      } finally {
        setBusyId('')
      }
    },
    [adminFetch, loadComplaints]
  )

  useEffect(() => {
    if (!isActive) return
    loadComplaints()
  }, [isActive, loadComplaints])

  return (
    <section className="card complaintsPanel">
      <h2>Жалобы на Magic Photo</h2>
      <p className="fieldHint">
        Пользователь поставил дизлайк и оставил жалобу. «Вернуть» — полный возврат + 50% бонус. «Отменить
        претензию» — подарок 50% от стоимости генерации.
      </p>
      <p className="status">{status}</p>
      <div className="complaintsGrid">
        {items.length === 0 ? (
          <p className="fieldHint">Открытых жалоб пока нет.</p>
        ) : (
          items.map((item) => (
            <ComplaintCard key={item.id} item={item} busyId={busyId} onAction={handleAction} />
          ))
        )}
      </div>
    </section>
  )
}

export async function fetchComplaintsBadgeCount(adminFetch) {
  const response = await adminFetch('/admin/magic-photo/complaints/count')
  const data = await response.json()
  return Number(data.count || 0)
}
