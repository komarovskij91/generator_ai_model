import { useCallback, useEffect, useMemo, useState } from 'react'

function sortPosts(items, status) {
  return (items || [])
    .filter((item) => item.status === status)
    .sort((a, b) => (b.published_at || b.updated_at || 0) - (a.published_at || a.updated_at || 0))
}

const captionFields = [
  { key: 'caption_ru', label: 'Текст RU' },
  { key: 'caption_en', label: 'Text EN' },
  { key: 'caption_de', label: 'Text DE' },
  { key: 'caption_fr', label: 'Text FR' },
  { key: 'caption_pt', label: 'Text PT' },
  { key: 'caption_es', label: 'Text ES' },
]

export default function FeedPostsTab({ adminFetch, isActive }) {
  const [sourceStats, setSourceStats] = useState({ total_count: 0, available_count: 0, used_count: 0 })
  const [drafts, setDrafts] = useState([])
  const [posts, setPosts] = useState([])
  const [draftEdits, setDraftEdits] = useState({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)
  const [seedLikesCount, setSeedLikesCount] = useState(0)
  const [showReadyPosts, setShowReadyPosts] = useState(false)
  const [showPublishedPosts, setShowPublishedPosts] = useState(false)

  const readyPosts = useMemo(() => sortPosts(posts, 'ready'), [posts])
  const publishedPosts = useMemo(() => sortPosts(posts, 'published'), [posts])

  const draftValue = (draft, key) => {
    if (draftEdits[draft.id] && key in draftEdits[draft.id]) return draftEdits[draft.id][key]
    return draft[key] ?? ''
  }

  const draftPatchFromEdit = (draft, edit = {}) => ({
    selected_candidate_id: edit.selected_candidate_id ?? draft.selected_candidate_id ?? null,
    ...Object.fromEntries(captionFields.map(({ key }) => [key, edit[key] ?? draft[key] ?? ''])),
    likes_count: edit.likes_count ?? draft.likes_count ?? 0,
    dislikes_count: edit.dislikes_count ?? draft.dislikes_count ?? 0,
    is_adult: Boolean(edit.is_adult ?? draft.is_adult),
    is_paid: Boolean(edit.is_paid ?? draft.is_paid),
    is_prime_only: Boolean(edit.is_prime_only ?? draft.is_prime_only),
  })

  const refreshAll = useCallback(async (silent = false) => {
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
  }, [adminFetch])

  useEffect(() => {
    if (!isActive) return undefined
    refreshAll()
    const timer = window.setInterval(() => {
      refreshAll(true)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [isActive, refreshAll])

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

  const queueDrafts = async () => {
    setBusy(true)
    setStatus('Ставлю генерацию постов в очередь…')
    try {
      await adminFetch('/admin/feed/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: Number(generateCount || 1),
          seed_likes_count: Number(seedLikesCount || 0),
        }),
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
      await patchDraft(draft.id, draftPatchFromEdit(draft, edit))
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
        const draft = drafts.find((item) => item.id === draftId) || {}
        await patchDraft(draftId, draftPatchFromEdit(draft, edit))
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
      await patchDraft(draft.id, draftPatchFromEdit(draft, edit))
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draft.id)}/save`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Пост сохранён в подготовленные')
    } catch (error) {
      setStatus(`Сохранение поста: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const deleteDraft = async (draftId) => {
    setBusy(true)
    try {
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE' })
      setDraftEdits((prev) => {
        const next = { ...prev }
        delete next[draftId]
        return next
      })
      await refreshAll(true)
      setStatus('Черновик удалён')
    } catch (error) {
      setStatus(`Удаление черновика: ${error.message}`)
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

  const setLocalPostFlag = (postId, key, checked) => {
    setPosts((prev) =>
      (prev || []).map((post) =>
        post.id === postId ? { ...post, [key]: checked } : post
      )
    )
  }

  const updatePostFlag = async (post, key, checked) => {
    const previous = Boolean(post[key])
    setLocalPostFlag(post.id, key, checked)
    setStatus('Сохраняю флаг поста…')
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(post.id)}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: checked }),
      })
      setStatus('Флаг поста сохранён')
    } catch (error) {
      setLocalPostFlag(post.id, key, previous)
      setStatus(`Флаг поста: ${error.message}`)
    }
  }

  const postFlagControls = (post) => (
    <div className="postFlagControls">
      <label className="flagToggle">
        <input
          type="checkbox"
          checked={Boolean(post.is_adult)}
          onChange={(event) => updatePostFlag(post, 'is_adult', event.target.checked)}
        />
        <span>Эротика</span>
      </label>
      <label className="flagToggle">
        <input
          type="checkbox"
          checked={Boolean(post.is_paid)}
          onChange={(event) => updatePostFlag(post, 'is_paid', event.target.checked)}
        />
        <span>Платный</span>
      </label>
      <label className="flagToggle">
        <input
          type="checkbox"
          checked={Boolean(post.is_prime_only)}
          onChange={(event) => updatePostFlag(post, 'is_prime_only', event.target.checked)}
        />
        <span>Только подписка</span>
      </label>
    </div>
  )

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
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div>
            <h2>Черновики постов</h2>
            <p className="fieldHint">Каждый черновик проходит очередь последовательно: картинки, затем тексты. Состояние сохраняется и переживает обновление страницы.</p>
            <p className="fieldHint">Можно задать базовые лайки перед генерацией: backend выставит каждому черновику случайное значение около этой цифры (+/-20%), а дизлайки автоматически поставит как 6% от лайков.</p>
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
            <input
              type="number"
              min="0"
              step="1"
              value={seedLikesCount}
              onChange={(e) => setSeedLikesCount(e.target.value)}
              style={{ width: 126 }}
              placeholder="Лайки"
              title="Базовые лайки"
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
                  {captionFields.map(({ key, label }) => (
                    <div className="card" key={key}>
                      <label>{label}</label>
                      <textarea
                        value={draftValue(draft, key)}
                        onChange={(e) =>
                          setDraftEdits((prev) => ({
                            ...prev,
                            [draft.id]: { ...(prev[draft.id] || {}), [key]: e.target.value },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="miniRow">
                  <div className="card" style={{ minWidth: 160 }}>
                    <label>Стартовые лайки</label>
                    <input
                      type="number"
                      min="0"
                      value={draftValue(draft, 'likes_count')}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), likes_count: Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>
                  <div className="card" style={{ minWidth: 160 }}>
                    <label>Стартовые дизлайки</label>
                    <input
                      type="number"
                      min="0"
                      value={draftValue(draft, 'dislikes_count')}
                      onChange={(e) =>
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), dislikes_count: Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>
                  <div className="card" style={{ minWidth: 220 }}>
                    <label>Доступ поста</label>
                    <div className="postFlagControls">
                      <label className="flagToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draftValue(draft, 'is_adult'))}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [draft.id]: { ...(prev[draft.id] || {}), is_adult: e.target.checked },
                            }))
                          }
                        />
                        <span>Эротика</span>
                      </label>
                      <label className="flagToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draftValue(draft, 'is_paid'))}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [draft.id]: { ...(prev[draft.id] || {}), is_paid: e.target.checked },
                            }))
                          }
                        />
                        <span>Платный</span>
                      </label>
                      <label className="flagToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draftValue(draft, 'is_prime_only'))}
                          onChange={(e) =>
                            setDraftEdits((prev) => ({
                              ...prev,
                              [draft.id]: { ...(prev[draft.id] || {}), is_prime_only: e.target.checked },
                            }))
                          }
                        />
                        <span>Только подписка</span>
                      </label>
                    </div>
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
                  <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deleteDraft(draft.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            )
          })}
          {drafts.length === 0 ? <p className="fieldHint">Черновиков пока нет.</p> : null}
        </div>
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div className="feedStat">
            <strong>{readyPosts.length}</strong>
            <span>Готово к автопубликации</span>
          </div>
          <button type="button" disabled={busy || readyPosts.length === 0} onClick={() => setShowReadyPosts((prev) => !prev)}>
            {showReadyPosts ? 'Скрыть посты' : 'Показать посты'}
          </button>
        </div>
        {showReadyPosts && (
          <div className="feedPreparedList">
            {readyPosts.map((post) => (
              <article key={post.id} className="feedPreparedCard">
                <img src={post.image_url} alt={post.id} />
                <div className="feedPreparedMeta">
                  <strong>{post.model_name}</strong>
                  <span>{post.status_ru}</span>
                  {post.caption_ru ? <p>{post.caption_ru}</p> : null}
                  {postFlagControls(post)}
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
          </div>
        )}
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div className="feedStat">
            <strong>{publishedPosts.length}</strong>
            <span>Уже опубликовано</span>
          </div>
          <button
            type="button"
            disabled={busy || publishedPosts.length === 0}
            onClick={() => setShowPublishedPosts((prev) => !prev)}
          >
            {showPublishedPosts ? 'Скрыть посты' : 'Показать посты'}
          </button>
        </div>
        {showPublishedPosts && (
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
                  {post.caption_ru ? <p>{post.caption_ru}</p> : null}
                  {postFlagControls(post)}
                </div>
                <div className="miniRow feedActions">
                  <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deletePost(post.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {status ? <p className="status">{status}</p> : null}
    </section>
  )
}
