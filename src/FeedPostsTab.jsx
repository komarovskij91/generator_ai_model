import { useEffect, useMemo, useState } from 'react'

function sortPosts(items, status) {
  return (items || [])
    .filter((item) => item.status === status)
    .sort((a, b) => (b.published_at || b.updated_at || 0) - (a.published_at || a.updated_at || 0))
}

export default function FeedPostsTab({ adminFetch, isActive }) {
  const [sourcePhotos, setSourcePhotos] = useState([])
  const [sourceStats, setSourceStats] = useState({ total_count: 0, available_count: 0, used_count: 0 })
  const [drafts, setDrafts] = useState([])
  const [posts, setPosts] = useState([])
  const [draftEdits, setDraftEdits] = useState({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)

  const readyPosts = useMemo(() => sortPosts(posts, 'ready'), [posts])
  const publishedPosts = useMemo(() => sortPosts(posts, 'published'), [posts])

  const draftValue = (draft, key) => {
    if (draftEdits[draft.id] && key in draftEdits[draft.id]) return draftEdits[draft.id][key]
    return draft[key] || ''
  }

  const refreshAll = async (silent = false) => {
    if (!silent) setBusy(true)
    try {
      const [sourceRes, draftRes, postRes] = await Promise.all([
        adminFetch('/admin/feed/source-photos'),
        adminFetch('/admin/feed/drafts'),
        adminFetch('/admin/feed/posts'),
      ])
      const [sourceData, draftData, postData] = await Promise.all([
        sourceRes.json(),
        draftRes.json(),
        postRes.json(),
      ])
      setSourcePhotos(Array.isArray(sourceData.items) ? sourceData.items : [])
      setSourceStats({
        total_count: Number(sourceData.total_count || 0),
        available_count: Number(sourceData.available_count || 0),
        used_count: Number(sourceData.used_count || 0),
      })
      setDrafts(Array.isArray(draftData.items) ? draftData.items : [])
      setPosts(Array.isArray(postData.items) ? postData.items : [])
      if (!silent) setStatus('Раздел постов обновлён')
    } catch (error) {
      setStatus(`Ошибка загрузки постов: ${error.message}`)
    } finally {
      if (!silent) setBusy(false)
    }
  }

  useEffect(() => {
    if (!isActive) return undefined
    refreshAll()
    const timer = window.setInterval(() => {
      refreshAll(true)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [isActive])

  const uploadFiles = async (files) => {
    const picked = Array.from(files || []).filter(Boolean)
    if (!picked.length) return
    setBusy(true)
    setStatus('Загружаю source photos…')
    try {
      const body = new FormData()
      picked.forEach((file) => body.append('files', file))
      await adminFetch('/admin/feed/source-photos/upload', { method: 'POST', body })
      await refreshAll(true)
      setStatus(`Добавлено фото: ${picked.length}`)
    } catch (error) {
      setStatus(`Ошибка загрузки фото: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handlePaste = async (event) => {
    const files = []
    const items = Array.from(event.clipboardData?.items || [])
    items.forEach((item) => {
      if (item.type?.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    })
    if (!files.length) return
    event.preventDefault()
    await uploadFiles(files)
  }

  const deleteSourcePhoto = async (photoId) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/feed/source-photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' })
      await refreshAll(true)
      setStatus('Фото удалено из базы')
    } catch (error) {
      setStatus(`Удаление фото: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const queueDrafts = async () => {
    setBusy(true)
    setStatus('Ставлю генерацию постов в очередь…')
    try {
      await adminFetch('/admin/feed/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Number(generateCount || 1) }),
      })
      await refreshAll(true)
      setStatus('Генерация поставлена в очередь')
    } catch (error) {
      setStatus(`Очередь постов: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const patchDraft = async (draftId, patch) => {
    await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  const saveDraftEdits = async (draft) => {
    setBusy(true)
    try {
      const edit = draftEdits[draft.id] || {}
      await patchDraft(draft.id, {
        selected_candidate_id: edit.selected_candidate_id ?? draft.selected_candidate_id ?? null,
        caption_ru: edit.caption_ru ?? draft.caption_ru ?? '',
        caption_en: edit.caption_en ?? draft.caption_en ?? '',
      })
      await refreshAll(true)
      setStatus('Правки черновика сохранены')
    } catch (error) {
      setStatus(`Сохранение черновика: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const queueDraftAction = async (draftId, action) => {
    setBusy(true)
    try {
      const edit = draftEdits[draftId]
      if (edit) {
        await patchDraft(draftId, {
          selected_candidate_id: edit.selected_candidate_id ?? null,
          caption_ru: edit.caption_ru ?? '',
          caption_en: edit.caption_en ?? '',
        })
      }
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draftId)}/${action}`, { method: 'POST' })
      await refreshAll(true)
      setStatus(action === 'regenerate-images' ? 'Картинки поставлены на регенерацию' : 'Текст поставлен на регенерацию')
    } catch (error) {
      setStatus(`Регенерация: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const saveDraftToPost = async (draft) => {
    setBusy(true)
    try {
      const edit = draftEdits[draft.id] || {}
      await patchDraft(draft.id, {
        selected_candidate_id: edit.selected_candidate_id ?? draft.selected_candidate_id ?? null,
        caption_ru: edit.caption_ru ?? draft.caption_ru ?? '',
        caption_en: edit.caption_en ?? draft.caption_en ?? '',
      })
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draft.id)}/save`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Пост сохранён в подготовленные')
    } catch (error) {
      setStatus(`Сохранение поста: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const publishPost = async (postId) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(postId)}/publish`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Пост опубликован')
    } catch (error) {
      setStatus(`Публикация: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const deletePost = async (postId) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' })
      await refreshAll(true)
      setStatus('Пост удалён')
    } catch (error) {
      setStatus(`Удаление поста: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="feedPostsPage">
      <section className="card">
        <div className="pushListHeader">
          <div>
            <h2>Source photos</h2>
            <p className="fieldHint">
              Загрузите фото через выбор файлов или вставьте их прямо в область ниже. После использования фото уходит из базы и больше не участвует в генерации.
            </p>
          </div>
          <button type="button" disabled={busy} onClick={() => refreshAll()}>
            Обновить
          </button>
        </div>
        <div className="feedStatsRow">
          <div className="feedStat">
            <strong>{sourceStats.available_count}</strong>
            <span>Доступно</span>
          </div>
          <div className="feedStat">
            <strong>{sourceStats.used_count}</strong>
            <span>Использовано</span>
          </div>
          <div className="feedStat">
            <strong>{sourceStats.total_count}</strong>
            <span>Всего</span>
          </div>
        </div>
        <div className="pasteZone feedPasteZone" onPaste={handlePaste} tabIndex={0}>
          Вставьте изображения сюда через Cmd/Ctrl+V или выберите файлы ниже.
        </div>
        <input type="file" accept="image/*" multiple onChange={(e) => uploadFiles(e.target.files)} />
        <div className="feedThumbGrid">
          {sourcePhotos.map((photo) => (
            <article key={photo.id} className="feedThumbCard">
              <img src={photo.image_url} alt={photo.id} />
              <div className="feedThumbMeta">
                <strong>{photo.status_ru}</strong>
                <small>{photo.prompt}</small>
              </div>
              <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deleteSourcePhoto(photo.id)}>
                Удалить
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div>
            <h2>Черновики постов</h2>
            <p className="fieldHint">Каждый черновик проходит очередь последовательно: картинки, затем тексты. Состояние сохраняется и переживает обновление страницы.</p>
          </div>
          <div className="miniRow">
            <input
              type="number"
              min="1"
              max="100"
              value={generateCount}
              onChange={(e) => setGenerateCount(e.target.value)}
              style={{ width: 96 }}
            />
            <button type="button" disabled={busy || sourceStats.available_count === 0} onClick={queueDrafts}>
              Создать черновики
            </button>
          </div>
        </div>
        <div className="feedDraftList">
          {drafts.map((draft) => {
            const selectedId = draftValue(draft, 'selected_candidate_id') || draft.selected_candidate_id
            return (
              <article key={draft.id} className="feedDraftCard">
                <div className="feedDraftHeader">
                  <div className="miniRow">
                    {draft.model_avatar_url ? <img className="feedMiniAvatar" src={draft.model_avatar_url} alt={draft.model_name} /> : null}
                    <div>
                      <h3>{draft.model_name}</h3>
                      <p className="fieldHint">{draft.status_ru}</p>
                    </div>
                  </div>
                  {draft.error ? <p className="feedError">{draft.error}</p> : null}
                </div>
                <div className="feedDraftTop">
                  <img className="feedSourcePreview" src={draft.source_photo_url} alt={draft.source_photo_id} />
                  <div>
                    <p className="fieldHint">Промт от source photo</p>
                    <p>{draft.prompt}</p>
                  </div>
                </div>
                <div className="feedCandidateGrid">
                  {draft.image_candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={selectedId === candidate.id ? 'feedCandidate active' : 'feedCandidate'}
                      onClick={() =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), selected_candidate_id: candidate.id },
                        }))
                      }
                    >
                      <img src={candidate.image_url} alt={candidate.id} />
                      <span>{selectedId === candidate.id ? 'Выбрано' : 'Выбрать'}</span>
                    </button>
                  ))}
                </div>
                <div className="grid">
                  <div className="card">
                    <label>Текст RU</label>
                    <textarea
                      value={draftValue(draft, 'caption_ru')}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), caption_ru: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="card">
                    <label>Text EN</label>
                    <textarea
                      value={draftValue(draft, 'caption_en')}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), caption_en: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="miniRow feedActions">
                  <button type="button" disabled={busy} onClick={() => saveDraftEdits(draft)}>
                    Сохранить правки
                  </button>
                  <button type="button" disabled={busy} onClick={() => queueDraftAction(draft.id, 'regenerate-images')}>
                    Новые картинки
                  </button>
                  <button type="button" disabled={busy} onClick={() => queueDraftAction(draft.id, 'regenerate-text')}>
                    Новый текст
                  </button>
                  <button type="button" disabled={busy || draft.saved_post_id} onClick={() => saveDraftToPost(draft)}>
                    {draft.saved_post_id ? 'Уже сохранён' : 'Сохранить пост'}
                  </button>
                </div>
              </article>
            )
          })}
          {drafts.length === 0 ? <p className="fieldHint">Черновиков пока нет.</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Подготовленные посты</h2>
        <div className="feedPreparedList">
          {readyPosts.map((post) => (
            <article key={post.id} className="feedPreparedCard">
              <img src={post.image_url} alt={post.id} />
              <div className="feedPreparedMeta">
                <strong>{post.model_name}</strong>
                <span>{post.status_ru}</span>
                <p>{post.caption_ru}</p>
              </div>
              <div className="miniRow feedActions">
                <button type="button" disabled={busy} onClick={() => publishPost(post.id)}>
                  Опубликовать
                </button>
                <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deletePost(post.id)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
          {readyPosts.length === 0 ? <p className="fieldHint">Подготовленных постов пока нет.</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>Опубликованные</h2>
        <div className="feedPreparedList">
          {publishedPosts.map((post) => (
            <article key={post.id} className="feedPreparedCard">
              <img src={post.image_url} alt={post.id} />
              <div className="feedPreparedMeta">
                <strong>{post.model_name}</strong>
                <span>
                  {post.status_ru}
                  {post.published_at ? ` · ${new Date(post.published_at * 1000).toLocaleString('ru-RU')}` : ''}
                </span>
                <p>{post.caption_ru}</p>
              </div>
            </article>
          ))}
          {publishedPosts.length === 0 ? <p className="fieldHint">Публикаций пока нет.</p> : null}
        </div>
      </section>

      {status ? <p className="status">{status}</p> : null}
    </section>
  )
}
