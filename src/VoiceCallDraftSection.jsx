import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVE_STATUSES = new Set(['queued', 'running'])

function isActiveSection(section) {
  return ACTIVE_STATUSES.has(String(section?.status || ''))
}

function visiblePhotoUrls(state) {
  const urls = Array.isArray(state?.photos?.urls) ? state.photos.urls : []
  const videoSource = state?.video?.source_image_url
  if (videoSource) {
    return urls.filter((url) => url === videoSource)
  }
  return urls
}

export default function VoiceCallDraftSection({
  adminFetch,
  avatarUrl,
  modelSlug,
  sessionId,
  voiceCallImageUrl,
  voiceCallVideoUrl,
  onFinalized,
  disabled = false,
}) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [startingVideoUrl, setStartingVideoUrl] = useState('')
  const [statusHint, setStatusHint] = useState('')
  const pollTimeoutRef = useRef(null)
  const finalizeRef = useRef(false)
  const lastStartedRef = useRef('')

  const loadDraft = useCallback(
    async ({ silent = false } = {}) => {
      if (!sessionId) return null
      if (!silent) setBusy(true)
      try {
        const response = await adminFetch(`/admin/voice-call-draft/${encodeURIComponent(sessionId)}`)
        const data = await response.json()
        setState(data)
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current)
          pollTimeoutRef.current = null
        }
        const active = isActiveSection(data.photos) || isActiveSection(data.video)
        if (active) {
          pollTimeoutRef.current = setTimeout(() => {
            loadDraft({ silent: true })
          }, 3500)
        }
        return data
      } catch (error) {
        if (!silent) setStatusHint(error.message)
        return null
      } finally {
        if (!silent) setBusy(false)
      }
    },
    [adminFetch, sessionId]
  )

  const startPhotos = useCallback(async () => {
    if (!avatarUrl || !sessionId || disabled) return
    setBusy(true)
    setStatusHint('Запускаю генерацию фото для звонка…')
    finalizeRef.current = false
    try {
      const response = await adminFetch('/admin/voice-call-draft/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reference_image_url: avatarUrl,
          model_slug: modelSlug || 'new_model',
        }),
      })
      const data = await response.json()
      setState(data)
      setStatusHint('Генерация 3 фото для звонка запущена')
      loadDraft({ silent: true })
    } catch (error) {
      setStatusHint(`Фото звонка: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }, [adminFetch, avatarUrl, disabled, loadDraft, modelSlug, sessionId])

  useEffect(() => {
    if (!avatarUrl || !sessionId) {
      setState(null)
      return
    }
    if (disabled && voiceCallImageUrl && voiceCallVideoUrl) {
      return
    }
    if (voiceCallImageUrl && voiceCallVideoUrl) {
      loadDraft({ silent: true })
      return
    }
    const marker = `${sessionId}:${avatarUrl}`
    if (lastStartedRef.current === marker) {
      loadDraft({ silent: true })
      return
    }
    lastStartedRef.current = marker
    startPhotos()
  }, [avatarUrl, disabled, loadDraft, sessionId, startPhotos, voiceCallImageUrl, voiceCallVideoUrl])

  useEffect(
    () => () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    },
    []
  )

  const finalizeDraft = useCallback(async () => {
    const imageUrl = state?.video?.source_image_url
    const videoUrl = state?.video?.video_url
    if (!sessionId || !imageUrl || !videoUrl || finalizeRef.current) return
    finalizeRef.current = true
    setBusy(true)
    setStatusHint('Загружаю аватар звонка в R2…')
    try {
      const response = await adminFetch(`/admin/voice-call-draft/${encodeURIComponent(sessionId)}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          video_url: videoUrl,
          model_slug: modelSlug || 'new_model',
        }),
      })
      const data = await response.json()
      onFinalized?.({
        imageUrl: data.voice_call_image_url,
        videoUrl: data.voice_call_video_url,
      })
      setState(data)
      setStatusHint('Аватар звонка сохранён в R2')
    } catch (error) {
      finalizeRef.current = false
      setStatusHint(`R2: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }, [adminFetch, modelSlug, onFinalized, sessionId, state?.video?.source_image_url, state?.video?.video_url])

  useEffect(() => {
    if (voiceCallImageUrl && voiceCallVideoUrl) return
    if (state?.video?.status !== 'done' || !state?.video?.video_url) return
    finalizeDraft()
  }, [finalizeDraft, state?.video?.status, state?.video?.video_url, voiceCallImageUrl, voiceCallVideoUrl])

  const startVideo = async (imageUrl) => {
    if (!sessionId || !imageUrl) return
    setStartingVideoUrl(imageUrl)
    setBusy(true)
    finalizeRef.current = false
    setStatusHint('Запускаю видео для звонка…')
    try {
      const response = await adminFetch(
        `/admin/voice-call-draft/${encodeURIComponent(sessionId)}/video/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl }),
        }
      )
      const data = await response.json()
      setState(data)
      loadDraft({ silent: true })
    } catch (error) {
      setStatusHint(`Видео: ${error.message}`)
    } finally {
      setBusy(false)
      setStartingVideoUrl('')
    }
  }

  const regeneratePhotos = async () => {
    if (!sessionId || !avatarUrl) return
    setBusy(true)
    finalizeRef.current = false
    onFinalized?.({ imageUrl: '', videoUrl: '' })
    try {
      const response = await adminFetch(
        `/admin/voice-call-draft/${encodeURIComponent(sessionId)}/regenerate-photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference_image_url: avatarUrl,
            model_slug: modelSlug || 'new_model',
          }),
        }
      )
      const data = await response.json()
      setState(data)
      loadDraft({ silent: true })
    } catch (error) {
      setStatusHint(`Перегенерация: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (!avatarUrl) return null

  const photoUrls = visiblePhotoUrls(state)
  const videoUrl = state?.video?.video_url || voiceCallVideoUrl || ''
  const ready = Boolean(voiceCallImageUrl && voiceCallVideoUrl)
  const videoSource = state?.video?.source_image_url
  const photosBusy = isActiveSection(state?.photos)
  const videoBusy = isActiveSection(state?.video)

  return (
    <div className="voiceCallDraftSection">
      <h3>Аватар для звонка</h3>
      <p className="fieldHint">
        После загрузки avatar автоматически генерируются 3 квадратных фото с телефоном. Выберите одно → видео →
        загрузка в R2.
      </p>
      {ready ? (
        <p className="fieldHint voiceCallReady">
          Готово: image и video для звонка сохранены в R2.
        </p>
      ) : null}
      {statusHint ? <p className="fieldHint">{statusHint}</p> : null}
      <div className="miniRow">
        <span className="fieldHint voiceCallStatusLine">
          Фото: {state?.photos?.status_ru || '—'}
          {state?.photos?.error ? ` · ${state.photos.error}` : ''}
        </span>
        <button type="button" disabled={busy || disabled || photosBusy} onClick={regeneratePhotos}>
          Перегенерировать 3 фото
        </button>
      </div>
      {photoUrls.length ? (
        <div className="voiceCallPhotoGrid">
          {photoUrls.map((url) => (
            <article className="moderationCard voiceCallCard" key={url}>
              <img className="voiceCallSquareMedia" src={url} alt="" />
              {!videoSource && !ready ? (
                <button
                  type="button"
                  disabled={busy || disabled || videoBusy || startingVideoUrl === url}
                  onClick={() => startVideo(url)}
                >
                  {startingVideoUrl === url ? 'Запуск…' : 'Сделать видео'}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="fieldHint">{photosBusy ? 'Генерируем 3 фото…' : 'Ожидание фото…'}</p>
      )}
      {(videoSource || videoUrl || videoBusy) && !ready ? (
        <div className="voiceCallVideoSection">
          <p className="fieldHint voiceCallStatusLine">
            Видео: {state?.video?.status_ru || '—'}
            {state?.video?.error ? ` · ${state.video.error}` : ''}
          </p>
          {videoUrl ? (
            <article className="moderationCard voiceCallCard voiceCallVideoCard">
              <video className="voiceCallSquareMedia" src={videoUrl} controls muted playsInline />
            </article>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
