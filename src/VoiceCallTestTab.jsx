import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVE_STATUSES = new Set(['queued', 'running'])

function isActiveSection(section) {
  return ACTIVE_STATUSES.has(String(section?.status || ''))
}

export default function VoiceCallTestTab({ adminFetch, isActive }) {
  const [models, setModels] = useState([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [state, setState] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('')
  const [startingVideoUrl, setStartingVideoUrl] = useState('')
  const pollTimeoutRef = useRef(null)

  const loadModels = useCallback(async () => {
    const response = await adminFetch('/admin/models')
    const data = await response.json()
    const items = Array.isArray(data.items) ? data.items : []
    setModels(items)
    if (!selectedModelId && items[0]?.id) setSelectedModelId(items[0].id)
  }, [adminFetch, selectedModelId])

  const loadState = useCallback(
    async (modelId = selectedModelId, { silent = false } = {}) => {
      if (!modelId) return
      if (!silent) setBusy(true)
      try {
        const response = await adminFetch(`/admin/models/${encodeURIComponent(modelId)}/voice-call-test`)
        const data = await response.json()
        setState(data)
        if (!silent) setStatus('Состояние загружено')
        const photosActive = isActiveSection(data.photos)
        const videoActive = isActiveSection(data.video)
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current)
          pollTimeoutRef.current = null
        }
        if (photosActive || videoActive) {
          pollTimeoutRef.current = setTimeout(() => {
            loadState(modelId, { silent: true })
          }, 3500)
        }
      } catch (error) {
        if (!silent) setStatus(`Ошибка: ${error.message}`)
      } finally {
        if (!silent) setBusy(false)
      }
    },
    [adminFetch, selectedModelId]
  )

  useEffect(() => {
    if (!isActive) return
    loadModels().catch((error) => setStatus(`Ошибка списка моделей: ${error.message}`))
  }, [isActive, loadModels])

  useEffect(() => {
    if (!isActive || !selectedModelId) return
    setSelectedPhotoUrl('')
    loadState(selectedModelId)
  }, [isActive, selectedModelId, loadState])

  useEffect(() => {
    if (isActive) return undefined
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    return undefined
  }, [isActive])

  useEffect(
    () => () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    },
    []
  )

  const runAction = async (label, request) => {
    if (!selectedModelId) return
    setBusy(true)
    setStatus(label)
    try {
      const response = await request()
      const data = await response.json()
      setState(data)
      setStatus(label.replace('…', ' — готово'))
      const photosActive = isActiveSection(data.photos)
      const videoActive = isActiveSection(data.video)
      if (photosActive || videoActive) {
        loadState(selectedModelId, { silent: true })
      }
    } catch (error) {
      setStatus(`${label.replace('…', '')}: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const startTest = () =>
    runAction('Запускаю генерацию фото…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(selectedModelId)}/voice-call-test/start`, {
        method: 'POST',
      })
    )

  const regeneratePhotos = () =>
    runAction('Перегенерирую 3 фото…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(selectedModelId)}/voice-call-test/regenerate-photos`, {
        method: 'POST',
      })
    )

  const startVideo = async (imageUrl) => {
    if (!selectedModelId || !imageUrl) return
    setStartingVideoUrl(imageUrl)
    await runAction('Запускаю видео…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(selectedModelId)}/voice-call-test/video/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
    )
    setStartingVideoUrl('')
  }

  const regenerateVideo = () =>
    runAction('Перегенерирую видео…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(selectedModelId)}/voice-call-test/video/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: selectedPhotoUrl || state?.video?.source_image_url || '' }),
      })
    )

  const applyAssets = () => {
    const imageUrl = selectedPhotoUrl
    const videoUrl = state?.video?.video_url
    if (!imageUrl) {
      setStatus('Выберите фото для применения')
      return
    }
    if (!videoUrl) {
      setStatus('Сначала сгенерируйте видео')
      return
    }
    return runAction('Применяю к модели…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(selectedModelId)}/voice-call-test/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, video_url: videoUrl }),
      })
    )
  }

  const photoUrls = Array.isArray(state?.photos?.urls) ? state.photos.urls : []
  const videoUrl = state?.video?.video_url || ''
  const photosBusy = isActiveSection(state?.photos)
  const videoBusy = isActiveSection(state?.video)
  const appliedImage = state?.applied?.voice_call_image_url || ''
  const appliedVideo = state?.applied?.voice_call_video_url || ''

  return (
    <section className="contentModerationPage">
      <section className="card">
        <h2>Тест: аватар звонка (voice call)</h2>
        <p className="fieldHint">
          Референс — только avatar модели. Kling omni-image → 3 квадратных фото, затем omni-video для одного выбранного
          фото. После «Применить» URL сохраняются в поля <code>voice_call_image_url</code> и{' '}
          <code>voice_call_video_url</code>.
        </p>
        <div className="miniRow">
          <select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
            <option value="">— Выберите модель —</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name || model.id} · {model.id}
              </option>
            ))}
          </select>
          <button type="button" className="primaryAction" disabled={busy || !selectedModelId} onClick={startTest}>
            Запустить
          </button>
          <button type="button" disabled={busy || !selectedModelId} onClick={() => loadState()}>
            Обновить
          </button>
        </div>
        {status ? <p className="status">{status}</p> : null}
      </section>

      {state?.source_avatar_url ? (
        <section className="card">
          <h3>Референс (avatar)</h3>
          <div className="moderationGrid">
            <article className="moderationCard">
              <img src={state.source_avatar_url} alt="Avatar reference" />
            </article>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="miniRow">
          <h3>Фото с телефоном (3 шт.)</h3>
          <button
            type="button"
            disabled={busy || !selectedModelId || photosBusy}
            onClick={regeneratePhotos}
          >
            Перегенерировать все 3
          </button>
        </div>
        <p className="fieldHint">
          Статус: {state?.photos?.status_ru || '—'}
          {state?.photos?.error ? ` · ${state.photos.error}` : ''}
        </p>
        {photoUrls.length ? (
          <div className="moderationGrid">
            {photoUrls.map((url) => {
              const selected = selectedPhotoUrl === url
              const isVideoSource = state?.video?.source_image_url === url
              return (
                <article className="moderationCard" key={url}>
                  <label className="pushUserRow">
                    <input
                      type="radio"
                      name="voice-call-photo"
                      checked={selected}
                      onChange={() => setSelectedPhotoUrl(url)}
                    />
                    <span>Выбрать для apply</span>
                  </label>
                  <img src={url} alt="Voice call candidate" />
                  <button
                    type="button"
                    disabled={busy || videoBusy || startingVideoUrl === url}
                    onClick={() => startVideo(url)}
                  >
                    {startingVideoUrl === url ? 'Запуск…' : isVideoSource && videoUrl ? 'Пересоздать видео' : 'Сделать видео'}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="fieldHint">Нажмите «Запустить», чтобы сгенерировать 3 фото.</p>
        )}
      </section>

      {(videoUrl || state?.video?.source_image_url || videoBusy) && (
        <section className="card">
          <div className="miniRow">
            <h3>Видео звонка (одно на модель)</h3>
            <button type="button" disabled={busy || videoBusy || !state?.video?.source_image_url} onClick={regenerateVideo}>
              Перегенерировать видео
            </button>
          </div>
          <p className="fieldHint">
            Статус: {state?.video?.status_ru || '—'}
            {state?.video?.error ? ` · ${state.video.error}` : ''}
          </p>
          {videoUrl ? (
            <div className="moderationGrid">
              <article className="moderationCard">
                <video src={videoUrl} controls muted playsInline />
              </article>
            </div>
          ) : null}
        </section>
      )}

      <section className="card">
        <h3>Применить к модели</h3>
        <p className="fieldHint">
          Отметьте одно фото и убедитесь, что видео готово. Файлы будут загружены в R2 и записаны в модель.
        </p>
        {(appliedImage || appliedVideo) && (
          <div className="fieldHint">
            <div>Текущие на модели:</div>
            {appliedImage ? <div>image: {appliedImage}</div> : null}
            {appliedVideo ? <div>video: {appliedVideo}</div> : null}
          </div>
        )}
        <button
          type="button"
          className="primaryAction"
          disabled={busy || !selectedPhotoUrl || !videoUrl}
          onClick={applyAssets}
        >
          Применить
        </button>
      </section>
    </section>
  )
}
