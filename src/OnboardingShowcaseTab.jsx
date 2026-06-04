import { useCallback, useEffect, useMemo, useState } from 'react'

const emptyMode = () => ({ models: [], posts: [], calls: [] })
const emptyConfig = () => ({ version: 1, start: 'all', modes: { all: emptyMode(), girl: emptyMode() } })

const modeLabels = {
  all: 'All (для App Store: девушки + аниме + парни)',
  girl: 'Girl (только девушки/аниме)',
}

const modelName = (model) =>
  model?.name || model?.name_i18n?.ru || model?.name_i18n?.en || model?.id || 'model'

const postName = (post) =>
  `${post?.model_name || post?.model_name_i18n?.ru || post?.model_id || 'post'} · ${post?.id}`

function UrlPreview({ url, kind = 'image' }) {
  const clean = String(url || '').trim()
  if (!clean) return <div className="showcasePreview empty">нет URL</div>
  if (kind === 'video' || /\.(mp4|m4v|mov|webm)(\?|$)/i.test(clean)) {
    return <video className="showcasePreview" src={clean} muted loop playsInline controls />
  }
  return <img className="showcasePreview" src={clean} alt="" loading="lazy" decoding="async" />
}

export default function OnboardingShowcaseTab({ adminFetch, isActive }) {
  const [config, setConfig] = useState(emptyConfig)
  const [models, setModels] = useState([])
  const [posts, setPosts] = useState([])
  const [mode, setMode] = useState('all')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const current = config.modes?.[mode] || emptyMode()
  const modelById = useMemo(() => Object.fromEntries(models.map((m) => [m.id, m])), [models])
  const postById = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts])

  const refresh = useCallback(async () => {
    if (!isActive) return
    setBusy(true)
    try {
      const [cfgRes, modelRes, postRes] = await Promise.all([
        adminFetch('/admin/onboarding/showcase-config'),
        adminFetch('/admin/models'),
        adminFetch('/admin/feed/posts?status=published&limit=100'),
      ])
      const cfg = await cfgRes.json()
      const modelData = await modelRes.json()
      const postData = await postRes.json()
      const loadedStart = (cfg.start || 'all').toString().trim().toLowerCase() === 'girl' ? 'girl' : 'all'
      setConfig({
        ...emptyConfig(),
        ...cfg,
        start: loadedStart,
        modes: { ...emptyConfig().modes, ...(cfg.modes || {}) },
      })
      setModels(Array.isArray(modelData.items) ? modelData.items : [])
      setPosts(Array.isArray(postData.items) ? postData.items : [])
      setStatus('Onboarding showcase загружен')
    } catch (error) {
      setStatus(`Ошибка загрузки: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }, [adminFetch, isActive])

  useEffect(() => {
    if (isActive) refresh()
  }, [isActive, refresh])

  const updateMode = (patch) => {
    setConfig((prev) => ({
      ...prev,
      modes: {
        ...prev.modes,
        [mode]: { ...emptyMode(), ...(prev.modes?.[mode] || {}), ...patch },
      },
    }))
  }

  const setActiveStart = (newStart) => {
    const normalized = newStart === 'girl' ? 'girl' : 'all'
    setConfig((prev) => ({ ...prev, start: normalized }))
  }

  const save = async () => {
    setBusy(true)
    try {
      const res = await adminFetch('/admin/onboarding/showcase-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      setConfig(await res.json())
      setStatus('Сохранено')
    } catch (error) {
      setStatus(`Ошибка сохранения: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const uploadOverride = async (file, section, index, field) => {
    if (!file) return
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('media_kind', field === 'video_url' ? 'story_video' : 'story_image')
      body.append('model_slug', 'onboarding_showcase')
      const res = await adminFetch('/admin/media/upload', { method: 'POST', body })
      const data = await res.json()
      updateListItem(section, index, { [field]: data.url })
      setStatus(`Загружено: ${data.url}`)
    } catch (error) {
      setStatus(`Ошибка загрузки: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const updateList = (section, items) => updateMode({ [section]: items })
  const updateListItem = (section, index, patch) => {
    const next = [...(current[section] || [])]
    next[index] = { ...next[index], ...patch }
    updateList(section, next)
  }
  const removeListItem = (section, index) => {
    updateList(section, (current[section] || []).filter((_, i) => i !== index))
  }
  const addModel = (section, modelId = '') => {
    const item = section === 'models' ? { model_id: modelId, image_url: '', video_url: '' } : { model_id: modelId }
    updateList(section, [...(current[section] || []), item])
  }
  const addPost = (postId = '') => updateList('posts', [...(current.posts || []), { post_id: postId }])

  return (
    <section className="showcasePage">
      <article className="card cardWide">
        <div className="pushListHeader">
          <div>
            <h2>Onboarding showcase</h2>
            <p className="fieldHint">
              Настройка нового iOS onboarding: модели, посты, звонки. Есть два режима: <code>all</code> и <code>girl</code>.
              <br />
              <strong>Источник истины для приложения — этот конфиг + поле start ниже.</strong> Старый onboarding_config.json больше не используется для выбора контента после логина. (updated 2026-06-04)
            </p>
          </div>
          <div className="miniRow">
            <button type="button" disabled={busy} onClick={refresh}>Обновить</button>
            <button type="button" disabled={busy} onClick={save}>Сохранить</button>
          </div>
        </div>
        {status ? <p className="status">{status}</p> : null}
        <div className="tabs">
          {Object.entries(modeLabels).map(([key, label]) => (
            <button key={key} type="button" className={mode === key ? 'topTab active' : 'topTab'} onClick={() => setMode(key)}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #333' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Активный режим для приложения (источник истины)
          </div>
          <p className="fieldHint" style={{ marginBottom: 8 }}>
            Выбери, какой набор (all или girl) будет использоваться в приложении по умолчанию.
            После логина приложение запросит конфиг, возьмёт отсюда <code>start</code> и покажет контент из соответствующего режима.
            Это позволяет быстро переключать «безопасный для ревью App Store» / «полный».
          </p>
          <div className="miniRow">
            <button
              type="button"
              className={config.start === 'all' ? 'topTab active' : 'topTab'}
              onClick={() => setActiveStart('all')}
              disabled={busy}
            >
              All — девушки + аниме + парни (рекомендуется для App Store)
            </button>
            <button
              type="button"
              className={config.start === 'girl' ? 'topTab active' : 'topTab'}
              onClick={() => setActiveStart('girl')}
              disabled={busy}
            >
              Girl — только девушки/аниме
            </button>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="fieldHint">Сейчас в конфиге указано: </span>
            <strong>{config.start === 'girl' ? 'girl' : 'all'}</strong>
            <span className="fieldHint"> — приложение будет загружать именно этот режим для пост-логин онбординга.</span>
          </div>
        </div>
      </article>

      <ShowcaseSection
        title="1. Карточки моделей"
        hint="Выбери модели и при необходимости загрузи отдельное фото/видео для onboarding card."
        items={current.models || []}
        onAdd={() => addModel('models')}
        renderItem={(item, index) => (
          <div className="showcaseRow" key={`model-${index}`}>
            <select value={item.model_id || ''} onChange={(e) => updateListItem('models', index, { model_id: e.target.value })}>
              <option value="">— модель —</option>
              {models.map((m) => <option key={m.id} value={m.id}>{modelName(m)} · {m.id}</option>)}
            </select>
            <div className="showcasePreviewGrid">
              <UrlPreview url={item.image_url || modelById[item.model_id]?.discovery_image_url || modelById[item.model_id]?.avatar_url} />
              <UrlPreview url={item.video_url} kind="video" />
            </div>
            <input placeholder="override image_url" value={item.image_url || ''} onChange={(e) => updateListItem('models', index, { image_url: e.target.value })} />
            <input type="file" accept="image/*" onChange={(e) => uploadOverride(e.target.files?.[0], 'models', index, 'image_url')} />
            <input placeholder="override video_url" value={item.video_url || ''} onChange={(e) => updateListItem('models', index, { video_url: e.target.value })} />
            <input type="file" accept="video/*" onChange={(e) => uploadOverride(e.target.files?.[0], 'models', index, 'video_url')} />
            <button type="button" className="dangerButton" onClick={() => removeListItem('models', index)}>Удалить</button>
          </div>
        )}
      />

      <ShowcaseSection
        title="2. Посты"
        hint="Выбери опубликованные посты для второго экрана onboarding."
        items={current.posts || []}
        onAdd={() => addPost()}
        renderItem={(item, index) => (
          <div className="showcaseRow compact" key={`post-${index}`}>
            <select value={item.post_id || ''} onChange={(e) => updateListItem('posts', index, { post_id: e.target.value })}>
              <option value="">— пост —</option>
              {posts.map((p) => <option key={p.id} value={p.id}>{postName(p)}</option>)}
            </select>
            <UrlPreview url={postById[item.post_id]?.image_url} />
            <button type="button" className="dangerButton" onClick={() => removeListItem('posts', index)}>Удалить</button>
          </div>
        )}
      />

      <ShowcaseSection
        title="3. Звонки"
        hint="Выбери модели для экрана звонков. Видео/аудио берутся из voice_call и bio_short_audio_i18n модели."
        items={current.calls || []}
        onAdd={() => addModel('calls')}
        renderItem={(item, index) => (
          <div className="showcaseRow compact" key={`call-${index}`}>
            <select value={item.model_id || ''} onChange={(e) => updateListItem('calls', index, { model_id: e.target.value })}>
              <option value="">— модель —</option>
              {models.map((m) => <option key={m.id} value={m.id}>{modelName(m)} · {m.id}</option>)}
            </select>
            <UrlPreview url={modelById[item.model_id]?.voice_call_video_url || modelById[item.model_id]?.voice_call_image_url} kind="video" />
            <button type="button" className="dangerButton" onClick={() => removeListItem('calls', index)}>Удалить</button>
          </div>
        )}
      />
    </section>
  )
}

function ShowcaseSection({ title, hint, items, onAdd, renderItem }) {
  return (
    <article className="card cardWide">
      <div className="pushListHeader">
        <div>
          <h3>{title}</h3>
          <p className="fieldHint">{hint}</p>
        </div>
        <button type="button" onClick={onAdd}>Добавить</button>
      </div>
      <div className="showcaseList">
        {items.map(renderItem)}
        {!items.length && <p className="fieldHint">Пока пусто.</p>}
      </div>
    </article>
  )
}
