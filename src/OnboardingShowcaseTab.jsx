import { useCallback, useEffect, useMemo, useState } from 'react'

const emptyVariant = () => ({ models: [], posts: [], calls: [] })
const emptyConfig = () => ({
  version: 1,
  variants: { config1: emptyVariant(), config2: emptyVariant() },
  active_key: 'config1',
  active: emptyVariant(),
})

const variantLabels = {
  config1: 'Конфиг 1',
  config2: 'Конфиг 2',
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
  const [variant, setVariant] = useState('config1')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const current = (config.variants && config.variants[variant]) || emptyVariant()
  const modelById = useMemo(() => Object.fromEntries(models.map((m) => [m.id, m])), [models])
  const postById = useMemo(() => Object.fromEntries(posts.map((p) => [p.id, p])), [posts])

  // Group posts by model_id for filtered selection in the Posts section
  const postsByModel = useMemo(() => {
    const map = {}
    ;(posts || []).forEach((p) => {
      const mid = p.model_id || p.modelId || ''
      if (!map[mid]) map[mid] = []
      map[mid].push(p)
    })
    return map
  }, [posts])

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
      // Migrate old shape if needed
      const loadedVariants = cfg.variants || (cfg.modes ? {
        config1: cfg.modes.all || emptyVariant(),
        config2: cfg.modes.girl || emptyVariant(),
      } : emptyConfig().variants)
      const loadedActiveKey = cfg.active_key || (cfg.start && (cfg.start.toLowerCase() === 'girl' ? 'config2' : 'config1')) || 'config1'
      setConfig({
        ...emptyConfig(),
        ...cfg,
        variants: { ...emptyConfig().variants, ...loadedVariants },
        active_key: loadedActiveKey,
        active: cfg.active || loadedVariants[loadedActiveKey] || emptyVariant(),
      })
      setModels(Array.isArray(modelData.items) ? modelData.items : [])
      setPosts(Array.isArray(postData.items) ? postData.items : [])
      setVariant(loadedActiveKey) // default to the current active tab
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

  const updateVariant = (patch) => {
    setConfig((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        [variant]: { ...emptyVariant(), ...(prev.variants?.[variant] || {}), ...patch },
      },
    }))
  }

  const promoteToActive = async (key) => {
    if (!key) return
    setBusy(true)
    try {
      const chosen = (config.variants && config.variants[key]) || emptyVariant()
      const next = {
        ...config,
        active_key: key,
        active: { ...emptyVariant(), ...chosen },
      }
      setConfig(next)
      // Save the full editor config (includes active)
      const res = await adminFetch('/admin/onboarding/showcase-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const saved = await res.json()
      setConfig({
        ...emptyConfig(),
        ...saved,
        variants: { ...emptyConfig().variants, ...(saved.variants || saved.modes || {}) },
        active_key: saved.active_key || key,
        active: saved.active || chosen,
      })
      setStatus(`Конфиг ${key === 'config1' ? '1' : '2'} теперь основной для приложения`)
    } catch (error) {
      setStatus(`Ошибка сохранения активного: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      const res = await adminFetch('/admin/onboarding/showcase-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const saved = await res.json()
      const loadedVariants = saved.variants || (saved.modes ? {
        config1: saved.modes.all || emptyVariant(),
        config2: saved.modes.girl || emptyVariant(),
      } : emptyConfig().variants)
      const loadedActiveKey = saved.active_key || 'config1'
      setConfig({
        ...emptyConfig(),
        ...saved,
        variants: { ...emptyConfig().variants, ...loadedVariants },
        active_key: loadedActiveKey,
        active: saved.active || loadedVariants[loadedActiveKey] || emptyVariant(),
      })
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

  const updateList = (section, items) => updateVariant({ [section]: items })
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
              Здесь ты собираешь два варианта контента для пост-логин онбординга в приложении (модели, посты, звонки).
              <br />
              Приложение всегда делает один и тот же запрос и получает то, что ты здесь "сделал основным". Старый onboarding_config.json для этого не используется.
            </p>
          </div>
          <div className="miniRow">
            <button type="button" disabled={busy} onClick={refresh}>Обновить</button>
            <button type="button" disabled={busy} onClick={save}>Сохранить</button>
          </div>
        </div>
        {status ? <p className="status">{status}</p> : null}
        <div className="tabs">
          {Object.entries(variantLabels).map(([key, label]) => (
            <button key={key} type="button" className={variant === key ? 'topTab active' : 'topTab'} onClick={() => setVariant(key)}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #333' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Сделать этот конфиг основным для приложения
          </div>
          <p className="fieldHint" style={{ marginBottom: 8 }}>
            В приложении всегда один и тот же запрос. Здесь ты выбираешь, какой из двух своих конфигов (Конфиг 1 или Конфиг 2) сейчас является "истинно верным" и будет показан пользователям после логина.
            Нажми кнопку ниже — этот вариант сохранится как активный в Redis.
          </p>
          <div className="miniRow">
            <button
              type="button"
              disabled={busy}
              onClick={() => promoteToActive('config1')}
            >
              Сделать Конфиг 1 основным для приложения
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => promoteToActive('config2')}
            >
              Сделать Конфиг 2 основным для приложения
            </button>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="fieldHint">Сейчас активен: </span>
            <strong>{config.active_key === 'config2' ? 'Конфиг 2' : 'Конфиг 1'}</strong>
            <span className="fieldHint"> — приложение получит именно этот контент при следующем запросе.</span>
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
        hint="Сначала выбери модель — увидишь только её посты. Тыкни на нужный пост. Приложение получит именно его."
        items={current.posts || []}
        onAdd={() => addPost()}
        renderItem={(item, index) => {
          const chosenModelForPost = item.model_id || ''
          const filteredPosts = postsByModel[chosenModelForPost] || []
          return (
            <div className="showcaseRow compact" key={`post-${index}`}>
              {/* Model first, then only its posts */}
              <select
                value={chosenModelForPost}
                onChange={(e) => {
                  const newMid = e.target.value
                  // reset post when model changes
                  updateListItem('posts', index, { model_id: newMid, post_id: '' })
                }}
              >
                <option value="">— модель —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{modelName(m)} · {m.id}</option>
                ))}
              </select>

              <select
                value={item.post_id || ''}
                onChange={(e) => updateListItem('posts', index, { post_id: e.target.value, model_id: chosenModelForPost })}
                disabled={!chosenModelForPost}
              >
                <option value="">— пост этой модели —</option>
                {filteredPosts.map((p) => (
                  <option key={p.id} value={p.id}>{postName(p)}</option>
                ))}
              </select>

              <UrlPreview url={postById[item.post_id]?.image_url} />
              <button type="button" className="dangerButton" onClick={() => removeListItem('posts', index)}>Удалить</button>
            </div>
          )
        }}
      />

      <ShowcaseSection
        title="3. Звонки"
        hint="Кликни по аватарке созвона (voice call media) — модель добавится. Так проще понять, кого выбираешь для звонков."
        items={current.calls || []}
        onAdd={() => addModel('calls')}
        renderItem={(item, index) => (
          <div className="showcaseRow compact" key={`call-${index}`}>
            {/* Visual picker with voice call avatars */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 420 }}>
              {models.map((m) => {
                const vcVideo = m.voice_call_video_url || m.voice_call_video_mobile_url
                const vcImage = m.voice_call_image_url || m.voice_call_image_mobile_url || m.discovery_image_url || m.avatar_url
                const isSelected = item.model_id === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateListItem('calls', index, { model_id: m.id })}
                    style={{
                      border: isSelected ? '2px solid #4af' : '1px solid #444',
                      borderRadius: 8,
                      padding: 4,
                      background: isSelected ? 'rgba(70,170,255,0.1)' : 'transparent',
                      cursor: 'pointer',
                      width: 92,
                    }}
                    title={modelName(m)}
                  >
                    {vcVideo ? (
                      <video src={vcVideo} muted loop playsInline style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <img src={vcImage} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <div style={{ fontSize: 10, marginTop: 4, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {modelName(m)}
                    </div>
                  </button>
                )
              })}
            </div>

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
