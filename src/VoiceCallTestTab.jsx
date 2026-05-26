import { useCallback, useEffect, useRef, useState } from 'react'

const ACTIVE_STATUSES = new Set(['queued', 'running'])

function isActiveSection(section) {
  return ACTIVE_STATUSES.has(String(section?.status || ''))
}

function visiblePhotoUrls(item) {
  const urls = Array.isArray(item?.photos?.urls) ? item.photos.urls : []
  const videoSource = item?.video?.source_image_url
  if (videoSource) {
    return urls.filter((url) => url === videoSource)
  }
  return urls
}

function ModelVoiceCallBlock({ item, busyModelId, startingVideoKey, onStartVideo, onRegeneratePhotos, onRegenerateVideo, onApply }) {
  const modelId = item.model_id
  const photoUrls = visiblePhotoUrls(item)
  const videoUrl = item?.video?.video_url || ''
  const videoSource = item?.video?.source_image_url || ''
  const photosBusy = isActiveSection(item?.photos)
  const videoBusy = isActiveSection(item?.video)
  const applyImageUrl = videoSource || photoUrls[0] || ''
  const blockBusy = busyModelId === modelId

  return (
    <section className="card voiceCallModelBlock">
      <div className="voiceCallModelHeader">
        <h3>{item.model_name || modelId}</h3>
        <span className="fieldHint">{modelId}</span>
      </div>

      <div className="miniRow">
        <p className="fieldHint voiceCallStatusLine">
          Фото: {item?.photos?.status_ru || '—'}
          {item?.photos?.error ? ` · ${item.photos.error}` : ''}
        </p>
        <button type="button" disabled={blockBusy || photosBusy} onClick={() => onRegeneratePhotos(modelId)}>
          Перегенерировать все 3
        </button>
      </div>

      {photoUrls.length ? (
        <div className="voiceCallPhotoGrid">
          {photoUrls.map((url) => {
            const isVideoSource = videoSource === url
            const videoKey = `${modelId}:${url}`
            return (
              <article className="moderationCard voiceCallCard" key={url}>
                <img className="voiceCallSquareMedia" src={url} alt="" />
                {!videoSource ? (
                  <button
                    type="button"
                    disabled={blockBusy || videoBusy || startingVideoKey === videoKey}
                    onClick={() => onStartVideo(modelId, url)}
                  >
                    {startingVideoKey === videoKey ? 'Запуск…' : 'Сделать видео'}
                  </button>
                ) : null}
                {isVideoSource && videoUrl ? (
                  <span className="fieldHint">Выбрано для видео</span>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="fieldHint">
          {photosBusy ? 'Генерируем 3 фото…' : 'Фото ещё не готовы'}
        </p>
      )}

      {(videoSource || videoUrl || videoBusy) && (
        <div className="voiceCallVideoSection">
          <div className="miniRow">
            <p className="fieldHint voiceCallStatusLine">
              Видео: {item?.video?.status_ru || '—'}
              {item?.video?.error ? ` · ${item.video.error}` : ''}
            </p>
            <button
              type="button"
              disabled={blockBusy || videoBusy || !videoSource}
              onClick={() => onRegenerateVideo(modelId, videoSource)}
            >
              Перегенерировать видео
            </button>
          </div>
          {videoUrl ? (
            <article className="moderationCard voiceCallCard voiceCallVideoCard">
              <video className="voiceCallSquareMedia" src={videoUrl} controls muted playsInline />
            </article>
          ) : null}
        </div>
      )}

      <div className="voiceCallApplyRow">
        <button
          type="button"
          className="primaryAction"
          disabled={blockBusy || !applyImageUrl || !videoUrl}
          onClick={() => onApply(modelId, applyImageUrl, videoUrl)}
        >
          Применить к модели
        </button>
      </div>
    </section>
  )
}

export default function VoiceCallTestTab({ adminFetch, isActive }) {
  const [items, setItems] = useState([])
  const [batchStarted, setBatchStarted] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyModelId, setBusyModelId] = useState('')
  const [startingVideoKey, setStartingVideoKey] = useState('')
  const [activeJobs, setActiveJobs] = useState(0)
  const pollTimeoutRef = useRef(null)

  const loadBatch = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setBusy(true)
      try {
        const response = await adminFetch('/admin/voice-call-test/batch')
        const data = await response.json()
        const nextItems = Array.isArray(data.items) ? data.items : []
        setItems(nextItems)
        setActiveJobs(Number(data.active_jobs) || 0)
        if (!silent) setStatus(`Моделей в очереди: ${nextItems.length}`)
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current)
          pollTimeoutRef.current = null
        }
        const hasActive = (Number(data.active_jobs) || 0) > 0 || nextItems.some((item) => isActiveSection(item.photos) || isActiveSection(item.video))
        if (hasActive) {
          pollTimeoutRef.current = setTimeout(() => {
            loadBatch({ silent: true })
          }, 3500)
        }
        if (nextItems.length > 0) {
          setBatchStarted(true)
        }
        return data
      } catch (error) {
        if (!silent) setStatus(`Ошибка: ${error.message}`)
        return null
      } finally {
        if (!silent) setBusy(false)
      }
    },
    [adminFetch]
  )

  useEffect(() => {
    if (!isActive) return undefined
    loadBatch({ silent: true })
    return undefined
  }, [isActive, loadBatch])

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

  const startAll = async () => {
    setBusy(true)
    setStatus('Запускаю генерацию фото для всех моделей…')
    try {
      const response = await adminFetch('/admin/voice-call-test/start-all', { method: 'POST' })
      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setActiveJobs(Number(data.active_jobs) || 0)
      setBatchStarted(true)
      setStatus(
        `Запущено: ${data.started_count || 0}. Без avatar: ${data.skipped_no_avatar_count || 0}. Уже применены: ${data.skipped_applied_count || 0}.`
      )
      loadBatch({ silent: true })
    } catch (error) {
      setStatus(`Старт: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const runModelAction = async (modelId, label, request) => {
    setBusyModelId(modelId)
    setStatus(label)
    try {
      await request()
      setStatus(label.replace('…', ' — готово'))
      await loadBatch({ silent: true })
    } catch (error) {
      setStatus(`${label.replace('…', '')}: ${error.message}`)
    } finally {
      setBusyModelId('')
    }
  }

  const startVideo = async (modelId, imageUrl) => {
    const videoKey = `${modelId}:${imageUrl}`
    setStartingVideoKey(videoKey)
    await runModelAction(modelId, 'Запускаю видео…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(modelId)}/voice-call-test/video/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
    )
    setStartingVideoKey('')
  }

  const regeneratePhotos = (modelId) =>
    runModelAction(modelId, 'Перегенерирую 3 фото…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(modelId)}/voice-call-test/regenerate-photos`, {
        method: 'POST',
      })
    )

  const regenerateVideo = (modelId, imageUrl) =>
    runModelAction(modelId, 'Перегенерирую видео…', () =>
      adminFetch(`/admin/models/${encodeURIComponent(modelId)}/voice-call-test/video/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
    )

  const applyAssets = (modelId, imageUrl, videoUrl) =>
    runModelAction(modelId, 'Применяю к модели…', async () => {
      await adminFetch(`/admin/models/${encodeURIComponent(modelId)}/voice-call-test/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, video_url: videoUrl }),
      })
      setItems((prev) => prev.filter((item) => item.model_id !== modelId))
    })

  return (
    <section className="contentModerationPage voiceCallPage">
      <section className="card">
        <h2>Аватар звонка — пакетная генерация</h2>
        <p className="fieldHint">
          Нажмите «Начать» — для всех моделей без готовых voice call ассетов запустится очередь фото (Kling omni-image, 3
          квадрата). По каждой модели выберите фото → видео (до 20 параллельно). После «Применить» блок модели скрывается.
        </p>
        <div className="miniRow">
          <button type="button" className="primaryAction" disabled={busy} onClick={startAll}>
            Начать
          </button>
          <button type="button" disabled={busy} onClick={() => loadBatch()}>
            Обновить
          </button>
          {batchStarted ? (
            <span className="fieldHint">
              Моделей: {items.length}
              {activeJobs > 0 ? ` · активных задач: ${activeJobs}` : ''}
            </span>
          ) : null}
        </div>
        {status ? <p className="status">{status}</p> : null}
      </section>

      {!batchStarted && !items.length ? (
        <section className="card">
          <p className="fieldHint">Нажмите «Начать», чтобы поставить все модели в очередь на генерацию фото.</p>
        </section>
      ) : null}

      {items.map((item) => (
        <ModelVoiceCallBlock
          key={item.model_id}
          item={item}
          busyModelId={busyModelId}
          startingVideoKey={startingVideoKey}
          onStartVideo={startVideo}
          onRegeneratePhotos={regeneratePhotos}
          onRegenerateVideo={regenerateVideo}
          onApply={applyAssets}
        />
      ))}

      {batchStarted && !items.length ? (
        <section className="card">
          <p className="fieldHint">Все модели обработаны или уже имеют voice call ассеты.</p>
        </section>
      ) : null}
    </section>
  )
}
