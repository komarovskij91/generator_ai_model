import { useMemo, useState } from 'react'
import './App.css'

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || 'https://web-production-c51d.up.railway.app'

const ARCHETYPES = [
  { key: 'alt_girl', label: 'Альтушка' },
  { key: 'student_18_plus', label: 'Студентка (18+)' },
  { key: 'romantic', label: 'Романтичная' },
  { key: 'playful', label: 'Игривый вайб' },
  { key: 'confident', label: 'Уверенная' },
  { key: 'caring', label: 'Заботливая' },
  { key: 'creative', label: 'Творческая' },
  { key: 'sporty', label: 'Спортивная' },
]

const INTERESTS = [
  { key: 'music', label: 'Музыка' },
  { key: 'movies', label: 'Кино и сериалы' },
  { key: 'travel', label: 'Путешествия' },
  { key: 'gaming', label: 'Игры' },
  { key: 'fitness', label: 'Спорт и фитнес' },
  { key: 'fashion_beauty', label: 'Стиль и красота' },
  { key: 'self_growth', label: 'Саморазвитие' },
  { key: 'relationships', label: 'Отношения и общение' },
  { key: 'food_cooking', label: 'Еда и кулинария' },
  { key: 'books_reading', label: 'Книги и чтение' },
]

const ETHNICITIES = [
  { key: 'european', label: 'Европейка' },
  { key: 'east_asian', label: 'Восточноазиатская' },
  { key: 'black', label: 'Чернокожая' },
  { key: 'latina', label: 'Латиноамериканка' },
]

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const CYR_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

const toStableKey = (value) =>
  (value || '')
    .toLowerCase()
    .split('')
    .map((ch) => CYR_TO_LAT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'model'

const defaultForm = {
  slug: '',
  nameRu: '',
  nameEn: '',
  gender: 'female',
  age: 24,
  targetAgeGroup: 'younger',
  archetypeKeys: [],
  ethnicityKey: 'european',
  interestKeys: [],
  bioShortRu: '',
  bioShortEn: '',
  bioFullRu: '',
  bioFullEn: '',
  speakingStyleRu: '',
  speakingStyleEn: '',
  likesRu: '',
  likesEn: '',
  allowedTopics: '',
  tabooTopics: '',
  systemPromptCore: '',
  avatarUrl: '',
  coverUrl: '',
  storyImageUrls: [],
  storyVideoUrls: [],
  sortOrder: 100,
  isActive: true,
  schemaVersion: 4,
  createdBy: 'generator_web',
  source: 'generator_web',
}

const ruSourcePayloadFromForm = (form) => ({
  name_ru: form.nameRu,
  bio_short_ru: form.bioShortRu,
  bio_full_ru: form.bioFullRu,
  speaking_style_ru: form.speakingStyleRu,
  likes_ru: splitList(form.likesRu),
  allowed_topics_ru: splitList(form.allowedTopics),
  taboo_topics_ru: splitList(form.tabooTopics),
})

const modelDataFromForm = (form) => ({
  slug: form.slug.trim(),
  name_i18n: { ru: form.nameRu, en: form.nameEn },
  age: Number(form.age),
  gender: form.gender,
  target_age_group: form.targetAgeGroup,
  archetype_keys: form.archetypeKeys,
  ethnicity_key: form.ethnicityKey,
  interest_keys: form.interestKeys,
  interests: form.interestKeys,
  bio_short_i18n: { ru: form.bioShortRu, en: form.bioShortEn },
  bio_full_i18n: { ru: form.bioFullRu, en: form.bioFullEn },
  speaking_style_i18n: { ru: form.speakingStyleRu, en: form.speakingStyleEn },
  likes_i18n: { ru: splitList(form.likesRu), en: splitList(form.likesEn) },
  allowed_topics: splitList(form.allowedTopics),
  taboo_topics: splitList(form.tabooTopics),
  system_prompt_core: form.systemPromptCore,
  story_media: {
    avatar_url: form.avatarUrl || null,
    cover_url: form.coverUrl || null,
    story_image_urls: form.storyImageUrls,
    story_video_urls: form.storyVideoUrls,
  },
  is_active: Boolean(form.isActive),
  sort_order: Number(form.sortOrder),
  schema_version: Number(form.schemaVersion),
  created_by: form.createdBy,
  source: form.source,
})

const normalizePrefillPatch = (prefill) => {
  const asString = (value) => {
    if (Array.isArray(value)) return value.join(', ')
    if (value === null || value === undefined) return ''
    return String(value).replace(/^#+\s*/, '').trim()
  }
  const toArray = (value) =>
    Array.isArray(value)
      ? value.map((item) => String(item).trim()).filter(Boolean)
      : splitList(asString(value))

  const patch = {
    slug: asString(prefill.slug),
    gender: asString(prefill.gender) || 'female',
    nameRu: asString(prefill.nameRu || prefill.name_ru),
    nameEn: asString(prefill.nameEn || prefill.name_en),
    bioShortRu: asString(prefill.bioShortRu || prefill.bio_short_ru),
    bioShortEn: asString(prefill.bioShortEn || prefill.bio_short_en),
    bioFullRu: asString(prefill.bioFullRu || prefill.bio_full_ru),
    bioFullEn: asString(prefill.bioFullEn || prefill.bio_full_en),
    speakingStyleRu: asString(prefill.speakingStyleRu || prefill.speaking_style_ru),
    speakingStyleEn: asString(prefill.speakingStyleEn || prefill.speaking_style_en),
    likesRu: asString(prefill.likesRu || prefill.likes_ru),
    likesEn: asString(prefill.likesEn || prefill.likes_en),
    allowedTopics: asString(prefill.allowedTopics || prefill.allowed_topics),
    tabooTopics: asString(prefill.tabooTopics || prefill.taboo_topics),
    systemPromptCore: asString(prefill.systemPromptCore || prefill.system_prompt_core),
    ethnicityKey: asString(prefill.ethnicityKey || prefill.ethnicity_key) || 'european',
    targetAgeGroup: asString(prefill.targetAgeGroup || prefill.target_age_group) || 'younger',
    archetypeKeys: toArray(prefill.archetypeKeys || prefill.archetype_keys),
    interestKeys: toArray(prefill.interestKeys || prefill.interest_keys),
  }
  if ('age' in prefill && !Number.isNaN(Number(prefill.age))) {
    patch.age = Number(prefill.age)
  }
  if (!patch.slug) patch.slug = toStableKey(patch.nameEn || patch.nameRu || 'model')
  return patch
}

function App() {
  const [adminLogin, setAdminLogin] = useState(localStorage.getItem('admin_login') || '')
  const [loginDraft, setLoginDraft] = useState(localStorage.getItem('admin_login') || '')
  const [isAuthed, setIsAuthed] = useState(Boolean(localStorage.getItem('admin_login')))
  const [form, setForm] = useState(defaultForm)
  const [step, setStep] = useState('form')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [prefillBrief, setPrefillBrief] = useState('')
  const [prefillImageUrl, setPrefillImageUrl] = useState('')
  const previewModel = useMemo(() => modelDataFromForm(form), [form])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const toggleArray = (field, value) =>
    setForm((prev) => {
      const exists = prev[field].includes(value)
      return {
        ...prev,
        [field]: exists ? prev[field].filter((item) => item !== value) : [...prev[field], value],
      }
    })

  const withAdminHeaders = (headers = {}) => ({ ...headers, 'X-Admin-Login': adminLogin })
  const adminFetch = async (path, options = {}) => {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      headers: withAdminHeaders(options.headers || {}),
    })
    if (!response.ok) throw new Error(await response.text())
    return response
  }

  const login = async () => {
    setIsLoading(true)
    setStatus('')
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginDraft }),
      })
      if (!response.ok) throw new Error('Неверный логин')
      localStorage.setItem('admin_login', loginDraft)
      setAdminLogin(loginDraft)
      setIsAuthed(true)
      setStatus('Вход выполнен')
    } catch (error) {
      setStatus(`Ошибка входа: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadMedia = async (file, mediaKind) => {
    if (!file) return null
    const data = new FormData()
    data.append('file', file)
    data.append('media_kind', mediaKind)
    data.append('model_slug', form.slug || 'new_model')
    const response = await adminFetch('/admin/media/upload', { method: 'POST', body: data })
    return (await response.json()).url
  }

  const uploadSingleMedia = async (file, mediaKind) => {
    if (!file) return
    setIsLoading(true)
    try {
      const url = await uploadMedia(file, mediaKind)
      if (!url) return
      if (mediaKind === 'avatar') setField('avatarUrl', url)
      if (mediaKind === 'cover') setField('coverUrl', url)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadManyMedia = async (files, mediaKind) => {
    if (!files.length) return
    setIsLoading(true)
    try {
      const urls = []
      for (const file of files) {
        const url = await uploadMedia(file, mediaKind)
        if (url) urls.push(url)
      }
      if (mediaKind === 'story_image') setField('storyImageUrls', [...form.storyImageUrls, ...urls])
      if (mediaKind === 'story_video') setField('storyVideoUrls', [...form.storyVideoUrls, ...urls])
    } finally {
      setIsLoading(false)
    }
  }

  const removeStoryMedia = async (url, mediaKind) => {
    await adminFetch(`/admin/media?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
    if (mediaKind === 'story_image') {
      setField('storyImageUrls', form.storyImageUrls.filter((item) => item !== url))
    } else {
      setField('storyVideoUrls', form.storyVideoUrls.filter((item) => item !== url))
    }
  }

  const uploadPrefillPhoto = async (file) => {
    const url = await uploadMedia(file, 'story_image')
    if (url) setPrefillImageUrl(url)
  }

  const runPrefill = async () => {
    if (!prefillBrief.trim() && !prefillImageUrl) return
    setIsLoading(true)
    setStatus('Предгенерация...')
    try {
      const response = await adminFetch('/admin/prefill-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_text: prefillBrief.trim(), image_url: prefillImageUrl || null }),
      })
      const data = await response.json()
      const patch = normalizePrefillPatch(data.prefill || {})
      setForm((prev) => ({ ...prev, ...patch, avatarUrl: prev.avatarUrl || prefillImageUrl || '' }))
      setStatus('Черновик заполнен')
    } catch (error) {
      setStatus(`Ошибка предгенерации: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const generateEnglish = async () => {
    setIsLoading(true)
    setStatus('Генерация EN...')
    try {
      const response = await adminFetch('/admin/generate-en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_ru: ruSourcePayloadFromForm(form) }),
      })
      const en = (await response.json()).fields_en || {}
      setForm((prev) => ({
        ...prev,
        nameEn: en.name_en || prev.nameEn,
        bioShortEn: en.bio_short_en || prev.bioShortEn,
        bioFullEn: en.bio_full_en || prev.bioFullEn,
        speakingStyleEn: en.speaking_style_en || prev.speakingStyleEn,
        likesEn: (en.likes_en || splitList(prev.likesEn)).join(', '),
      }))
      setStatus('EN обновлены')
    } finally {
      setIsLoading(false)
    }
  }

  const createModel = async () => {
    if (!form.nameRu || !form.slug || !form.systemPromptCore || !form.avatarUrl) {
      setStatus('Заполни обязательные поля: name_ru, slug, system_prompt_core, avatar')
      return
    }
    if (!form.archetypeKeys.length || form.interestKeys.length < 3) {
      setStatus('Выбери минимум 1 типаж и минимум 3 интереса')
      return
    }
    setIsLoading(true)
    try {
      await adminFetch('/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_data: previewModel }),
      })
      setStatus('Модель создана')
      setForm(defaultForm)
      setPrefillImageUrl('')
      setPrefillBrief('')
      setStep('form')
    } catch (error) {
      setStatus(`Ошибка создания: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthed) {
    return (
      <main className="page">
        <section className="card">
          <h1>Generator AI Model</h1>
          <label>Введите admin login</label>
          <input value={loginDraft} onChange={(e) => setLoginDraft(e.target.value)} placeholder="Komar3000" />
          <button disabled={isLoading} onClick={login}>Войти</button>
          {status && <p className="status">{status}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Generator AI Model (v4)</h1>
        <div className="headerActions">
          <button onClick={() => setStep('form')}>Форма</button>
          <button onClick={() => setStep('preview')}>Preview</button>
          <button onClick={() => { localStorage.removeItem('admin_login'); setIsAuthed(false) }}>Выйти</button>
        </div>
      </header>

      {step === 'form' && (
        <>
          <section className="card prefillCard">
            <h2>Предгенерация через LLM</h2>
            <label>Короткое описание (RU)</label>
            <textarea value={prefillBrief} onChange={(e) => setPrefillBrief(e.target.value)} />
            <small className="fieldHint">Что это: свободный текст для первичного автозаполнения.</small>
            <small className="fieldExample">Пример: Брюнетка 25 лет, уверенная, любит музыку и путешествия.</small>
            <label>1 фото-референс (опционально)</label>
            <input type="file" accept="image/*" onChange={(e) => uploadPrefillPhoto(e.target.files?.[0])} />
            {prefillImageUrl && <a href={prefillImageUrl} target="_blank" rel="noreferrer">Открыть фото</a>}
            <button disabled={isLoading} onClick={runPrefill}>Сгенерировать черновик</button>
          </section>

          <section className="grid">
            <article className="card">
              <h2>База (обязательно)</h2>
              <label>Имя RU (`name_i18n.ru`) *</label>
              <input value={form.nameRu} onChange={(e) => setField('nameRu', e.target.value)} />
              <small className="fieldExample">Пример: Айви</small>
              <label>Имя EN (`name_i18n.en`)</label>
              <input value={form.nameEn} onChange={(e) => setField('nameEn', e.target.value)} />
              <small className="fieldExample">Пример: Ivy</small>
              <label>Slug (`slug`) *</label>
              <input value={form.slug} onChange={(e) => setField('slug', e.target.value)} />
              <small className="fieldHint">Уникальный тех-ID модели в snake_case.</small>
              <small className="fieldExample">Пример: ivy_romantic</small>
              <label>Пол (`gender`) *</label>
              <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                <option value="female">female</option>
                <option value="male">male</option>
              </select>
              <small className="fieldExample">Пример: female</small>
              <label>Возраст (`age`) *</label>
              <input type="number" value={form.age} onChange={(e) => setField('age', e.target.value)} />
              <small className="fieldExample">Пример: 24</small>
              <label>Возрастная группа (`target_age_group`) *</label>
              <select value={form.targetAgeGroup} onChange={(e) => setField('targetAgeGroup', e.target.value)}>
                <option value="younger">younger (18-24)</option>
                <option value="older">older (25-35+)</option>
              </select>
              <small className="fieldHint">Для фильтра “моложе/постарше”.</small>
              <label>Главная инструкция (`system_prompt_core`) *</label>
              <textarea value={form.systemPromptCore} onChange={(e) => setField('systemPromptCore', e.target.value)} />
              <small className="fieldExample">Пример: Отвечай тепло, уверенно, с легким флиртом и соблюдай границы.</small>
              <button disabled={isLoading} onClick={generateEnglish}>Сгенерировать EN из RU</button>
            </article>

            <article className="card">
              <h2>Фильтры (обязательно)</h2>
              <label>Типажи (`archetype_keys`, 1-3)</label>
              <div className="chips">
                {ARCHETYPES.map((item) => (
                  <label key={item.key} className="chip">
                    <input
                      type="checkbox"
                      checked={form.archetypeKeys.includes(item.key)}
                      onChange={() => toggleArray('archetypeKeys', item.key)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <small className="fieldHint">Что это: характерный вайб модели для подбора.</small>
              <label>Этничность (`ethnicity_key`)</label>
              <select value={form.ethnicityKey} onChange={(e) => setField('ethnicityKey', e.target.value)}>
                {ETHNICITIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <small className="fieldExample">Пример: european</small>
              <label>Интересы (`interest_keys`, 3-5)</label>
              <div className="chips">
                {INTERESTS.map((item) => (
                  <label key={item.key} className="chip">
                    <input
                      type="checkbox"
                      checked={form.interestKeys.includes(item.key)}
                      onChange={() => toggleArray('interestKeys', item.key)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <small className="fieldHint">Это стабильные ключи для фильтра в приложении.</small>
            </article>

            <article className="card">
              <h2>Тексты</h2>
              <label>Короткое описание RU (`bio_short_i18n.ru`) *</label>
              <textarea value={form.bioShortRu} onChange={(e) => setField('bioShortRu', e.target.value)} />
              <small className="fieldExample">Пример: Теплая и игривая, любит уютные разговоры.</small>
              <label>Короткое описание EN (`bio_short_i18n.en`)</label>
              <textarea value={form.bioShortEn} onChange={(e) => setField('bioShortEn', e.target.value)} />
              <small className="fieldExample">Пример: Warm and playful, loves cozy conversations.</small>
              <label>Полное описание RU (`bio_full_i18n.ru`) *</label>
              <textarea value={form.bioFullRu} onChange={(e) => setField('bioFullRu', e.target.value)} />
              <small className="fieldExample">Пример: Любит музыку, прогулки и живой флирт без грубости.</small>
              <label>Полное описание EN (`bio_full_i18n.en`)</label>
              <textarea value={form.bioFullEn} onChange={(e) => setField('bioFullEn', e.target.value)} />
              <small className="fieldExample">Пример: Loves music, walks, and playful conversations.</small>
              <label>Стиль общения RU (`speaking_style_i18n.ru`) *</label>
              <textarea value={form.speakingStyleRu} onChange={(e) => setField('speakingStyleRu', e.target.value)} />
              <small className="fieldExample">Пример: Коротко, живо, с вопросами и редкими эмодзи.</small>
              <label>Стиль общения EN (`speaking_style_i18n.en`)</label>
              <textarea value={form.speakingStyleEn} onChange={(e) => setField('speakingStyleEn', e.target.value)} />
              <small className="fieldExample">Пример: Short, engaging, asks follow-up questions.</small>
              <label>Что любит RU (`likes_i18n.ru`)</label>
              <input value={form.likesRu} onChange={(e) => setField('likesRu', e.target.value)} placeholder="музыка, кино, путешествия" />
              <small className="fieldHint">Список через запятую.</small>
              <label>Что любит EN (`likes_i18n.en`)</label>
              <input value={form.likesEn} onChange={(e) => setField('likesEn', e.target.value)} placeholder="music, movies, travel" />
              <label>Разрешенные темы (`allowed_topics`)</label>
              <input value={form.allowedTopics} onChange={(e) => setField('allowedTopics', e.target.value)} />
              <small className="fieldExample">Пример: communication, relationships, lifestyle</small>
              <label>Табу темы (`taboo_topics`)</label>
              <input value={form.tabooTopics} onChange={(e) => setField('tabooTopics', e.target.value)} />
              <small className="fieldExample">Пример: violence, illegal, hate, explicit_porn</small>
            </article>

            <article className="card">
              <h2>Media</h2>
              <label>Аватар (`story_media.avatar_url`) *</label>
              <input type="file" accept="image/*" onChange={(e) => uploadSingleMedia(e.target.files?.[0], 'avatar')} />
              {form.avatarUrl && <a href={form.avatarUrl} target="_blank" rel="noreferrer">avatar url</a>}
              <small className="fieldHint">Главная картинка для stories и карточек.</small>
              <label>Обложка (`story_media.cover_url`)</label>
              <input type="file" accept="image/*" onChange={(e) => uploadSingleMedia(e.target.files?.[0], 'cover')} />
              {form.coverUrl && <a href={form.coverUrl} target="_blank" rel="noreferrer">cover url</a>}
              <small className="fieldHint">Крупное фото профиля модели.</small>
              <label>Доп. фото (`story_media.story_image_urls[]`)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'story_image')} />
              {form.storyImageUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                  <button onClick={() => removeStoryMedia(url, 'story_image')}>x</button>
                </div>
              ))}
              <label>Видео (`story_media.story_video_urls[]`, {'<='}30MB)</label>
              <input type="file" accept="video/*" multiple onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'story_video')} />
              {form.storyVideoUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                  <button onClick={() => removeStoryMedia(url, 'story_video')}>x</button>
                </div>
              ))}
            </article>
          </section>
        </>
      )}

      {step === 'preview' && (
        <section className="previewGrid">
          <article className="card">
            <h2>Stories preview</h2>
            {form.avatarUrl ? <img className="avatarPreview" src={form.avatarUrl} alt="avatar" /> : <p>No avatar</p>}
            <p>{form.nameRu || 'Имя модели'}</p>
          </article>
          <article className="card">
            <h2>Payload</h2>
            <pre>{JSON.stringify(previewModel, null, 2)}</pre>
            <button disabled={isLoading} onClick={createModel}>Создать модель</button>
          </article>
        </section>
      )}

      {status && <p className="status">{status}</p>}
    </main>
  )
}

export default App
