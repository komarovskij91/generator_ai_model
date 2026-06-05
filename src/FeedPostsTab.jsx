import { useCallback, useEffect, useRef, useState } from 'react'
import { PaidMediaControls } from './PaidMediaControls'

const DRAFT_PAGE_SIZE = 20
const POST_PAGE_SIZE = 30

const emptyPage = { hasMore: false, nextOffset: 0, totalCount: 0, isLoading: false }

function mergeById(existing, incoming, { replace = false } = {}) {
  if (replace) return incoming || []
  const seen = new Set((existing || []).map((item) => item.id))
  return [...(existing || []), ...(incoming || []).filter((item) => !seen.has(item.id))]
}

function LoadMoreTrigger({ disabled, onLoadMore }) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node || disabled) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { rootMargin: '360px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [disabled, onLoadMore])

  return <div ref={ref} className="feedLoadSentinel" aria-hidden="true" />
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
  const [readyPosts, setReadyPosts] = useState([])
  const [publishedPosts, setPublishedPosts] = useState([])
  const [draftEdits, setDraftEdits] = useState({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)
  const [seedLikesCount, setSeedLikesCount] = useState(0)
  const [showReadyPosts, setShowReadyPosts] = useState(false)
  const [showPublishedPosts, setShowPublishedPosts] = useState(false)
  const [draftPage, setDraftPage] = useState(emptyPage)
  const [readyPage, setReadyPage] = useState(emptyPage)
  const [publishedPage, setPublishedPage] = useState(emptyPage)
  const draftPageRef = useRef(emptyPage)
  const readyPageRef = useRef(emptyPage)
  const publishedPageRef = useRef(emptyPage)
  const draftsRef = useRef([])

  const setDraftPageState = useCallback((nextPage) => {
    draftPageRef.current = nextPage
    setDraftPage(nextPage)
  }, [])

  // Keep a ref to latest drafts so polling interval can read fresh value without causing effect re-runs
  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  const setReadyPageState = useCallback((nextPage) => {
    readyPageRef.current = nextPage
    setReadyPage(nextPage)
  }, [])

  const setPublishedPageState = useCallback((nextPage) => {
    publishedPageRef.current = nextPage
    setPublishedPage(nextPage)
  }, [])

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
    unlock_cost: edit.unlock_cost ?? draft.unlock_cost ?? null,
    is_prime_only: Boolean(edit.is_prime_only ?? draft.is_prime_only),
  })

  const loadSourceStats = useCallback(async () => {
    const sourceRes = await adminFetch('/admin/feed/source-photos?limit=0')
    const sourceData = await sourceRes.json()
    setSourceStats({
      total_count: Number(sourceData.total_count || 0),
      available_count: Number(sourceData.available_count || 0),
      used_count: Number(sourceData.used_count || 0),
    })
  }, [adminFetch])

  const loadDrafts = useCallback(async ({ reset = false } = {}) => {
    const currentPage = draftPageRef.current
    if (currentPage.isLoading || (!reset && !currentPage.hasMore)) return
    const offset = reset ? 0 : Number(currentPage.nextOffset || 0)
    setDraftPageState({ ...currentPage, isLoading: true })
    try {
      const res = await adminFetch(`/admin/feed/drafts?limit=${DRAFT_PAGE_SIZE}&offset=${offset}`)
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
      setDrafts((prev) => mergeById(prev, items, { replace: reset }))
      setDraftPageState({
        hasMore: Boolean(data.has_more),
        nextOffset: Number(data.next_offset || 0),
        totalCount: Number(data.total_count || items.length),
        isLoading: false,
      })
    } catch (error) {
      setDraftPageState({ ...draftPageRef.current, isLoading: false })
      setStatus(`Загрузка черновиков: ${error.message}`)
    }
  }, [adminFetch, setDraftPageState])

  const loadPosts = useCallback(async (postStatus, { reset = false } = {}) => {
    const setItems = postStatus === 'published' ? setPublishedPosts : setReadyPosts
    const pageRef = postStatus === 'published' ? publishedPageRef : readyPageRef
    const setPageState = postStatus === 'published' ? setPublishedPageState : setReadyPageState
    const currentPage = pageRef.current
    if (currentPage.isLoading || (!reset && !currentPage.hasMore)) return
    const offset = reset ? 0 : Number(currentPage.nextOffset || 0)
    setPageState({ ...currentPage, isLoading: true })
    try {
      const res = await adminFetch(`/admin/feed/posts?status=${postStatus}&limit=${POST_PAGE_SIZE}&offset=${offset}`)
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
      setItems((prev) => mergeById(prev, items, { replace: reset }))
      setPageState({
        hasMore: Boolean(data.has_more),
        nextOffset: Number(data.next_offset || 0),
        totalCount: Number(data.total_count || items.length),
        isLoading: false,
      })
    } catch (error) {
      setPageState({ ...pageRef.current, isLoading: false })
      setStatus(`Загрузка постов: ${error.message}`)
    }
  }, [adminFetch, setPublishedPageState, setReadyPageState])

  const refreshAll = useCallback(async (silent = false) => {
    if (!silent) setBusy(true)
    try {
      await Promise.all([
        loadSourceStats(),
        loadDrafts({ reset: true }),
        loadPosts('ready', { reset: true }),
        loadPosts('published', { reset: true }),
      ])
      if (!silent) setStatus('Раздел постов обновлён')
    } catch (error) {
      setStatus(`Ошибка загрузки постов: ${error.message}`)
    } finally {
      if (!silent) setBusy(false)
    }
  }, [loadDrafts, loadPosts, loadSourceStats])

  useEffect(() => {
    if (!isActive) return undefined
    refreshAll()

    // Auto-refresh while there is pending generation work (images or video for drafts,
    // or recently started video on ready/published posts). This makes status/candidates/video
    // appear without manual "Скрыть/Показать" toggle.
    // Use draftsRef so we don't put `drafts` in deps (which was causing repeated refreshAll calls
    // and stuck "Подгружаю черновики…" loading indicator when the list is empty).
    const interval = setInterval(() => {
      const currentDrafts = draftsRef.current || []
      const hasPendingDraft = currentDrafts.some((d) => {
        const st = (d.status || '').toLowerCase()
        const vst = (d.video_status || '').toLowerCase()
        return st.includes('generat') || st.includes('queued') || ['queued', 'running', 'prompting'].includes(vst)
      })
      const hasOpenPostLists = showReadyPosts || showPublishedPosts
      if (hasPendingDraft || hasOpenPostLists) {
        refreshAll(true).catch(() => {})
      }
    }, 11000)

    return () => clearInterval(interval)
  }, [isActive, refreshAll, showReadyPosts, showPublishedPosts])

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
    // Default save from the main button treats as photo (even if video generated, user should use the explicit video choice buttons)
    setBusy(true)
    try {
      const edit = draftEdits[draft.id] || {}
      await patchDraft(draft.id, draftPatchFromEdit(draft, edit))
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draft.id)}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_video: false })
      })
      // Immediately remove from local list (draft disappears instantly after save choice)
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id))
      setDraftEdits((prev) => {
        const next = { ...prev }
        delete next[draft.id]
        return next
      })
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

  const generateVideoForDraft = async (draft) => {
    setBusy(true)
    setStatus('Запускаем генерацию видео для поста…')
    try {
      // Send the currently highlighted/selected candidate from local edits (or fall back to draft's).
      // This ensures "click image to highlight -> click generate video" uses exactly that image,
      // even if user didn't press "Сохранить правки" yet. Backend will persist the choice too.
      const edit = draftEdits[draft.id] || {}
      const effectiveSelected = edit.selected_candidate_id || draft.selected_candidate_id
      const body = effectiveSelected ? { selected_candidate_id: effectiveSelected } : {}
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draft.id)}/video/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      await refreshAll(true)
      setStatus('Генерация видео запущена (Kling)')
    } catch (error) {
      setStatus(`Видео поста: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const generateVideoForPost = async (postId) => {
    setBusy(true)
    setStatus('Генерируем видео для существующего поста…')
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(postId)}/video/start`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Видео для поста запущено (отслеживайте статус в карточке)')
    } catch (error) {
      setStatus(`Видео для поста: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const applyVideoForPost = async (postId) => {
    if (!window.confirm(
      'Применить это видео к посту?\n\n' +
      '• Оригинальный файл будет сохранён на R2 как video_original.\n' +
      '• Основная версия (video_url) будет оптимизирована через блюр-сервис без блюра (меньше размер, .m4v).\n' +
      '• Если пост помечен «Платный» с ценой — будет сгенерирована заблюренная превью-версия (video_preview_url) из оригинала.\n' +
      '• Пост станет видео-постом (is_video=true).\n\n' +
      'Продолжить?'
    )) {
      return
    }
    setBusy(true)
    setStatus('Применяем видео к посту (сохраняем оригинал + оптимизируем + при необходимости блюр)...')
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(postId)}/video/apply`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Видео применено к посту. Основная версия — без блюра.')
    } catch (error) {
      setStatus(`Применить видео: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const reoptimizeVideoForPost = async (postId) => {
    setBusy(true)
    setStatus('Ре-оптимизируем видео (sigma=0 через blur-сервис, без новой генерации Kling)…')
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(postId)}/video/optimize`, { method: 'POST' })
      await refreshAll(true)
      setStatus('Видео ре-оптимизировано (должен стать легче)')
    } catch (error) {
      setStatus(`Re-optimize видео: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const saveDraftToPostAs = async (draft, useVideo) => {
    setBusy(true)
    try {
      const edit = draftEdits[draft.id] || {}
      await patchDraft(draft.id, draftPatchFromEdit(draft, edit))
      await adminFetch(`/admin/feed/drafts/${encodeURIComponent(draft.id)}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_video: !!useVideo })
      })
      // Immediately remove from local list so draft disappears without waiting for next poll/refresh.
      // The backend already excludes saved drafts, refresh will keep it consistent.
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id))
      setDraftEdits((prev) => {
        const next = { ...prev }
        delete next[draft.id]
        return next
      })
      await refreshAll(true)
      setStatus(useVideo ? 'Сохранён как видео пост' : 'Сохранён как фото пост')
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

  const setLocalPostFlag = (postId, key, value) => {
    const updateItems = (prev) =>
      (prev || []).map((post) =>
        post.id === postId ? { ...post, [key]: value } : post
      )
    setReadyPosts(updateItems)
    setPublishedPosts(updateItems)
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

  const updatePostPaidFlags = async (post, nextFlags) => {
    const previous = {
      is_paid: Boolean(post.is_paid),
      unlock_cost: post.unlock_cost ?? null,
      preview_status: post.preview_status,
      preview_url: post.preview_url,
    }
    setLocalPostFlag(post.id, 'is_paid', Boolean(nextFlags.is_paid))
    setLocalPostFlag(post.id, 'unlock_cost', nextFlags.unlock_cost ?? null)
    setStatus('Сохраняю платный пост…')
    try {
      await adminFetch(`/admin/feed/posts/${encodeURIComponent(post.id)}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: Boolean(nextFlags.is_paid),
          unlock_cost: nextFlags.unlock_cost ?? null,
        }),
      })
      setStatus('Платный пост сохранён')
    } catch (error) {
      setLocalPostFlag(post.id, 'is_paid', previous.is_paid)
      setLocalPostFlag(post.id, 'unlock_cost', previous.unlock_cost)
      setStatus(`Платный пост: ${error.message}`)
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
      <PaidMediaControls
        flags={{
          is_paid: Boolean(post.is_paid),
          unlock_cost: post.unlock_cost ?? null,
          preview_status: post.preview_status,
          preview_url: post.preview_url,
        }}
        onChange={(nextFlags) =>
          updatePostPaidFlags(post, {
            is_paid: Boolean(nextFlags.is_paid),
            unlock_cost: nextFlags.unlock_cost ?? null,
          })
        }
      />
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
                    {draft.model_avatar_url ? <img className="feedMiniAvatar" src={draft.model_avatar_url} alt={draft.model_name} loading="lazy" decoding="async" /> : null}
                    <div>
                      <h3>{draft.model_name}</h3>
                      <p className="fieldHint">{draft.status_ru}</p>
                    </div>
                  </div>
                  {draft.error ? <p className="feedError">{draft.error}</p> : null}
                </div>
                <div className="feedDraftTop">
                  <img className="feedSourcePreview" src={draft.source_photo_url} alt={draft.source_photo_id} loading="lazy" decoding="async" />
                </div>
                <div className="feedCandidateGrid">
                  {draft.image_candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={selectedId === candidate.id ? 'feedCandidate active' : 'feedCandidate'}
                      onClick={async () => {
                        // Update local edit state for immediate UI (and for other batched fields)
                        setDraftEdits((prev) => ({
                          ...prev,
                          [draft.id]: { ...(prev[draft.id] || {}), selected_candidate_id: candidate.id },
                        }))
                        // Immediately persist the image selection to server.
                        // This makes "just highlight the image you want -> generate video (or save post)" reliable,
                        // and the choice survives refresh. Other caption/flag edits still use explicit "Сохранить правки".
                        try {
                          await patchDraft(draft.id, { selected_candidate_id: candidate.id })
                        } catch (e) {
                          // Non-fatal: local state has the choice; video gen and save flows will re-apply the patch.
                        }
                      }}
                    >
                      <img src={candidate.image_url} alt={candidate.id} loading="lazy" decoding="async" />
                      <span>{selectedId === candidate.id ? 'Выбрано' : 'Выбрать'}</span>
                    </button>
                  ))}
                </div>

                {/* Video for post generation (from selected image, Kling video flow) */}
                {selectedId ? (
                  <div className="feedVideoSection" style={{ margin: '12px 0' }}>
                    {/* Progress / status for long Kling video gen - better than plain text */}
                    {draft.video_status && !draft.video_url && draft.video_status !== 'done' ? (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                          {draft.video_status_ru || draft.video_status}
                          {draft.video_error ? ` — ${draft.video_error}` : ''}
                        </div>
                        <progress
                          value={
                            draft.video_status === 'queued' ? 15 :
                            draft.video_status === 'prompting' ? 40 :
                            draft.video_status === 'running' ? 85 : 60
                          }
                          max="100"
                          style={{ width: '100%', height: 8 }}
                        />
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>Генерация видео может занять 1–3 минуты…</div>
                      </div>
                    ) : null}

                    {!draft.video_url && draft.video_status !== 'done' ? (
                      <button
                        type="button"
                        disabled={busy || (draft.video_status && draft.video_status !== 'failed')}
                        onClick={() => generateVideoForDraft(draft)}
                      >
                        {draft.video_status === 'running' || draft.video_status === 'prompting' || draft.video_status === 'queued'
                          ? (draft.video_status_ru || 'Генерируем видео…')
                          : 'Сгенерировать видео для поста'}
                      </button>
                    ) : null}

                    {draft.video_url ? (
                      <div>
                        <div style={{ marginBottom: 6, fontSize: 12, opacity: 0.8 }}>
                          Видео для поста (raw из Kling — для просмотра). При «Сохранить как ВИДЕО пост» будет: оригинал на R2 + оптимизированная без блюра (main video_url) + (если платный) блюр превью из оригинала.
                        </div>
                        <video
                          controls
                          style={{ width: '100%', maxWidth: 420, borderRadius: 8, background: '#111' }}
                          src={draft.video_url}
                        />
                        <div className="miniRow" style={{ marginTop: 8 }}>
                          <button type="button" disabled={busy} onClick={() => saveDraftToPostAs(draft, true)}>
                            Сохранить как ВИДЕО пост
                          </button>
                          <button type="button" disabled={busy} onClick={() => saveDraftToPostAs(draft, false)}>
                            Сохранить как ФОТО пост (без видео)
                          </button>
                        </div>
                        <p className="fieldHint" style={{ fontSize: 11 }}>Выберите тип при сохранении. Видео будет использовано если нажать "ВИДЕО пост".</p>
                      </div>
                    ) : draft.video_status ? (
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{draft.video_status_ru || draft.video_status} {draft.video_error ? `— ${draft.video_error}` : ''}</div>
                    ) : null}
                  </div>
                ) : null}

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
                      <PaidMediaControls
                        flags={{
                          is_paid: Boolean(draftValue(draft, 'is_paid')),
                          unlock_cost: draftValue(draft, 'unlock_cost') ?? null,
                        }}
                        onChange={(nextFlags) =>
                          setDraftEdits((prev) => ({
                            ...prev,
                            [draft.id]: {
                              ...(prev[draft.id] || {}),
                              is_paid: Boolean(nextFlags.is_paid),
                              unlock_cost: nextFlags.unlock_cost ?? null,
                            },
                          }))
                        }
                      />
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
          {drafts.length > 0 ? (
            <p className="fieldHint">Показано {drafts.length} из {draftPage.totalCount}</p>
          ) : null}
          {/* Only render the infinite-scroll sentinel when there might be more. This + the ref-based polling prevents the "Подгружаю черновики…" from ever getting stuck when the list is (and stays) empty. */}
          {draftPage.hasMore ? (
            <LoadMoreTrigger
              disabled={!isActive || draftPage.isLoading}
              onLoadMore={() => loadDrafts()}
            />
          ) : null}
          {draftPage.isLoading ? <p className="fieldHint">Подгружаю черновики…</p> : null}
        </div>
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div className="feedStat">
            <strong>{readyPage.totalCount || readyPosts.length}</strong>
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
                <div style={{ position: 'relative' }}>
                  <img src={post.image_url} alt={post.id} loading="lazy" decoding="async" />
                  {post.video_url ? (
                    <div style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: 10,
                      padding: '1px 4px',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      🎥
                    </div>
                  ) : null}
                </div>
                <div className="feedPreparedMeta">
                  <strong>{post.model_name}</strong>
                  <span>{post.status_ru} {post.video_url ? '🎥' : ''}</span>
                  {post.caption_ru ? <p>{post.caption_ru}</p> : null}
                  {postFlagControls(post)}
                </div>
                <div className="miniRow feedActions">
                  {(() => {
                    const vs = (post.video_status || '').toLowerCase()
                    const isGen = ['queued', 'prompting', 'running'].includes(vs)
                    const isReview = vs === 'review' && post.video_url
                    if (isGen) {
                      return (
                        <span style={{ fontSize: 11, opacity: 0.85 }}>
                          {post.video_status_ru || post.video_status}
                          {post.video_error ? ` — ${post.video_error}` : ''}
                        </span>
                      )
                    }
                    if (isReview) {
                      return (
                        <>
                          <video controls style={{ width: 120, height: 80, borderRadius: 4 }} src={post.video_url} />
                          <button type="button" disabled={busy} onClick={() => applyVideoForPost(post.id)}>
                            Применить видео
                          </button>
                        </>
                      )
                    }
                    if (!post.is_video && (!post.video_status || vs === 'failed')) {
                      return (
                        <button type="button" disabled={busy} onClick={() => generateVideoForPost(post.id)}>
                          Сгенерировать видео
                        </button>
                      )
                    }
                    if (post.video_url) {
                      return (
                        <>
                          <video controls style={{ width: 120, height: 80, borderRadius: 4 }} src={post.video_url} />
                          <button type="button" disabled={busy} onClick={() => reoptimizeVideoForPost(post.id)}>
                            Уменьшить видео (re-optimize)
                          </button>
                        </>
                      )
                    }
                    return null
                  })()}
                  <button type="button" disabled={busy} onClick={() => publishPost(post.id)}>
                    Опубликовать
                  </button>
                  <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deletePost(post.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            ))}
            <LoadMoreTrigger
              disabled={!isActive || !showReadyPosts || !readyPage.hasMore || readyPage.isLoading}
              onLoadMore={() => loadPosts('ready')}
            />
            {readyPage.isLoading ? <p className="fieldHint">Подгружаю посты…</p> : null}
          </div>
        )}
      </section>

      <section className="card">
        <div className="pushListHeader">
          <div className="feedStat">
            <strong>{publishedPage.totalCount || publishedPosts.length}</strong>
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
                <div style={{ position: 'relative' }}>
                  <img src={post.image_url} alt={post.id} loading="lazy" decoding="async" />
                  {post.video_url ? (
                    <div style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      fontSize: 10,
                      padding: '1px 4px',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      🎥
                    </div>
                  ) : null}
                </div>
                <div className="feedPreparedMeta">
                  <strong>{post.model_name}</strong>
                  <span>
                    {post.status_ru}
                    {post.video_url ? ' 🎥' : ''}
                    {post.published_at ? ` · ${new Date(post.published_at * 1000).toLocaleString('ru-RU')}` : ''}
                  </span>
                  {post.caption_ru ? <p>{post.caption_ru}</p> : null}
                  {postFlagControls(post)}
                </div>
                <div className="miniRow feedActions">
                  {(() => {
                    const vs = (post.video_status || '').toLowerCase()
                    const isGen = ['queued', 'prompting', 'running'].includes(vs)
                    const isReview = vs === 'review' && post.video_url
                    if (isGen) {
                      return (
                        <span style={{ fontSize: 11, opacity: 0.85 }}>
                          {post.video_status_ru || post.video_status}
                          {post.video_error ? ` — ${post.video_error}` : ''}
                        </span>
                      )
                    }
                    if (isReview) {
                      return (
                        <>
                          <video controls style={{ width: 120, height: 80, borderRadius: 4 }} src={post.video_url} />
                          <button type="button" disabled={busy} onClick={() => applyVideoForPost(post.id)}>
                            Применить видео
                          </button>
                        </>
                      )
                    }
                    if (!post.is_video && (!post.video_status || vs === 'failed')) {
                      return (
                        <button type="button" disabled={busy} onClick={() => generateVideoForPost(post.id)}>
                          Сгенерировать видео
                        </button>
                      )
                    }
                    if (post.video_url) {
                      return (
                        <>
                          <video controls style={{ width: 120, height: 80, borderRadius: 4 }} src={post.video_url} />
                          <button type="button" disabled={busy} onClick={() => reoptimizeVideoForPost(post.id)}>
                            Уменьшить видео (re-optimize)
                          </button>
                        </>
                      )
                    }
                    return null
                  })()}
                  <button type="button" className="secondaryMuted" disabled={busy} onClick={() => deletePost(post.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            ))}
            <LoadMoreTrigger
              disabled={!isActive || !showPublishedPosts || !publishedPage.hasMore || publishedPage.isLoading}
              onLoadMore={() => loadPosts('published')}
            />
            {publishedPage.isLoading ? <p className="fieldHint">Подгружаю посты…</p> : null}
          </div>
        )}
      </section>

      {status ? <p className="status">{status}</p> : null}
    </section>
  )
}
