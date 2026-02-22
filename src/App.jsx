import { useMemo, useState } from 'react'
import './App.css'

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || 'https://web-production-c51d.up.railway.app'

const defaultForm = {
  slug: '',
  sortOrder: 100,
  isActive: true,
  schemaVersion: 3,
  createdBy: 'generator_web',
  source: 'generator_web',
  gender: 'female',
  age: 24,

  nameRu: '',
  nameEn: '',
  bioShortRu: '',
  bioShortEn: '',
  bioFullRu: '',
  bioFullEn: '',
  speakingStyleRu: '',
  speakingStyleEn: '',
  systemPromptCore: '',

  characterTraits: '',
  interests: '',
  tabooTopics: '',
  allowedTopics: '',
  boundaries: '',
  personaRules: '',
  mediaRules: '',

  bodyTypeKey: '',
  bodyTypeRu: '',
  bodyTypeEn: '',
  ethnicityKey: '',
  ethnicityRu: '',
  ethnicityEn: '',

  languageKeys: '',
  languagesRu: '',
  languagesEn: '',

  relationshipStatusKey: '',
  relationshipStatusRu: '',
  relationshipStatusEn: '',

  occupationKey: '',
  occupationRu: '',
  occupationEn: '',

  hobbyKeys: '',
  hobbiesRu: '',
  hobbiesEn: '',

  personalityKeys: '',
  personalityRu: '',
  personalityEn: '',

  avatarUrl: '',
  coverUrl: '',
  storyImageUrls: [],
  storyVideoUrls: [],
}

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
    .replace(/^_+|_+$/g, '') || 'unknown'

const ruSourcePayloadFromForm = (form) => ({
  name_ru: form.nameRu,
  bio_short_ru: form.bioShortRu,
  bio_full_ru: form.bioFullRu,
  speaking_style_ru: form.speakingStyleRu,
  body_type_ru: form.bodyTypeRu,
  ethnicity_ru: form.ethnicityRu,
  languages_ru: splitList(form.languagesRu),
  relationship_status_ru: form.relationshipStatusRu,
  occupation_ru: form.occupationRu,
  hobbies_ru: splitList(form.hobbiesRu),
  personality_ru: splitList(form.personalityRu),
  character_traits_ru: splitList(form.characterTraits),
  interests_ru: splitList(form.interests),
  taboo_topics_ru: splitList(form.tabooTopics),
  allowed_topics_ru: splitList(form.allowedTopics),
  boundaries_ru: splitList(form.boundaries),
  persona_rules_ru: splitList(form.personaRules),
  media_rules_ru: splitList(form.mediaRules),
})

const modelDataFromForm = (form) => ({
  // keep localized interests text, but build filter keys as stable snake_case
  // so downstream search/filter stays consistent.
  slug: form.slug.trim(),
  name_i18n: { ru: form.nameRu, en: form.nameEn },
  gender: form.gender,
  age: Number(form.age),
  bio_short_i18n: { ru: form.bioShortRu, en: form.bioShortEn },
  bio_full_i18n: { ru: form.bioFullRu, en: form.bioFullEn },
  speaking_style_i18n: { ru: form.speakingStyleRu, en: form.speakingStyleEn },
  system_prompt_core: form.systemPromptCore,
  character_traits: splitList(form.characterTraits),
  interests: splitList(form.interests),
  taboo_topics: splitList(form.tabooTopics),
  allowed_topics: splitList(form.allowedTopics),
  boundaries: splitList(form.boundaries),
  persona_rules: splitList(form.personaRules),
  media_rules: splitList(form.mediaRules),
  story_media: {
    avatar_url: form.avatarUrl || null,
    cover_url: form.coverUrl || null,
    story_image_urls: form.storyImageUrls,
    story_video_urls: form.storyVideoUrls,
  },
  profile_details: {
    age: Number(form.age),
    body_type_key: form.bodyTypeKey,
    body_type: form.bodyTypeKey,
    body_type_i18n: { ru: form.bodyTypeRu, en: form.bodyTypeEn },
    ethnicity_key: form.ethnicityKey,
    ethnicity: form.ethnicityKey,
    ethnicity_i18n: { ru: form.ethnicityRu, en: form.ethnicityEn },
    language_keys: splitList(form.languageKeys),
    languages: splitList(form.languageKeys),
    languages_i18n: { ru: splitList(form.languagesRu), en: splitList(form.languagesEn) },
    relationship_status_key: form.relationshipStatusKey,
    relationship_status: form.relationshipStatusKey,
    relationship_status_i18n: { ru: form.relationshipStatusRu, en: form.relationshipStatusEn },
    occupation_key: form.occupationKey,
    occupation: form.occupationKey,
    occupation_i18n: { ru: form.occupationRu, en: form.occupationEn },
    hobby_keys: splitList(form.hobbyKeys),
    hobbies: splitList(form.hobbyKeys),
    hobbies_i18n: { ru: splitList(form.hobbiesRu), en: splitList(form.hobbiesEn) },
    personality_keys: splitList(form.personalityKeys),
    personality: splitList(form.personalityKeys),
    personality_i18n: { ru: splitList(form.personalityRu), en: splitList(form.personalityEn) },
  },
  discover_filters: {
    body_type_keys: splitList(form.bodyTypeKey),
    ethnicity_keys: splitList(form.ethnicityKey),
    languages_keys: splitList(form.languageKeys),
    interest_keys: splitList(form.interests).map(toStableKey),
    personality_keys: splitList(form.personalityKeys),
    relationship_status_keys: splitList(form.relationshipStatusKey),
    occupation_keys: splitList(form.occupationKey),
    age_min: Number(form.age),
    age_max: Number(form.age),
  },
  schema_version: Number(form.schemaVersion),
  created_by: form.createdBy,
  source: form.source,
  sort_order: Number(form.sortOrder),
  is_active: Boolean(form.isActive),
})

const normalizePrefillPatch = (prefill) => {
  const asString = (value) => {
    if (Array.isArray(value)) return value.join(', ')
    if (value === null || value === undefined) return ''
    return String(value)
  }
  const fromAliases = (aliases) => {
    for (const key of aliases) {
      if (key in prefill && prefill[key] !== null && prefill[key] !== undefined && String(prefill[key]).trim() !== '') {
        return prefill[key]
      }
    }
    return undefined
  }
  const parseBool = (value) => {
    if (typeof value === 'boolean') return value
    const normalized = String(value || '').trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
  }
  const toKeyList = (value) => splitList(asString(value)).map(toStableKey).join(', ')

  const patch = {}
  const aliases = {
    slug: ['slug', 'model_slug'],
    gender: ['gender', 'sex'],
    nameRu: ['nameRu', 'name_ru', 'name_ru_i18n', 'name'],
    nameEn: ['nameEn', 'name_en'],
    bioShortRu: ['bioShortRu', 'bio_short_ru'],
    bioShortEn: ['bioShortEn', 'bio_short_en'],
    bioFullRu: ['bioFullRu', 'bio_full_ru'],
    bioFullEn: ['bioFullEn', 'bio_full_en'],
    speakingStyleRu: ['speakingStyleRu', 'speaking_style_ru'],
    speakingStyleEn: ['speakingStyleEn', 'speaking_style_en'],
    systemPromptCore: ['systemPromptCore', 'system_prompt_core', 'prompt'],
    bodyTypeKey: ['bodyTypeKey', 'body_type_key'],
    bodyTypeRu: ['bodyTypeRu', 'body_type_ru'],
    bodyTypeEn: ['bodyTypeEn', 'body_type_en'],
    ethnicityKey: ['ethnicityKey', 'ethnicity_key'],
    ethnicityRu: ['ethnicityRu', 'ethnicity_ru'],
    ethnicityEn: ['ethnicityEn', 'ethnicity_en'],
    languageKeys: ['languageKeys', 'language_keys'],
    languagesRu: ['languagesRu', 'languages_ru'],
    languagesEn: ['languagesEn', 'languages_en'],
    relationshipStatusKey: ['relationshipStatusKey', 'relationship_status_key'],
    relationshipStatusRu: ['relationshipStatusRu', 'relationship_status_ru'],
    relationshipStatusEn: ['relationshipStatusEn', 'relationship_status_en'],
    occupationKey: ['occupationKey', 'occupation_key'],
    occupationRu: ['occupationRu', 'occupation_ru'],
    occupationEn: ['occupationEn', 'occupation_en'],
    hobbyKeys: ['hobbyKeys', 'hobby_keys'],
    hobbiesRu: ['hobbiesRu', 'hobbies_ru'],
    hobbiesEn: ['hobbiesEn', 'hobbies_en'],
    personalityKeys: ['personalityKeys', 'personality_keys'],
    personalityRu: ['personalityRu', 'personality_ru'],
    personalityEn: ['personalityEn', 'personality_en'],
    characterTraits: ['characterTraits', 'character_traits'],
    interests: ['interests', 'interests_ru'],
    tabooTopics: ['tabooTopics', 'taboo_topics'],
    allowedTopics: ['allowedTopics', 'allowed_topics'],
    boundaries: ['boundaries'],
    personaRules: ['personaRules', 'persona_rules'],
    mediaRules: ['mediaRules', 'media_rules'],
  }
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    const value = fromAliases(fieldAliases)
    if (value !== undefined) {
      patch[field] = asString(value)
    }
  }

  const ageRaw = fromAliases(['age'])
  const sortRaw = fromAliases(['sortOrder', 'sort_order'])
  const activeRaw = fromAliases(['isActive', 'is_active'])
  if (ageRaw !== undefined && !Number.isNaN(Number(ageRaw))) patch.age = Number(ageRaw)
  if (sortRaw !== undefined && !Number.isNaN(Number(sortRaw))) patch.sortOrder = Number(sortRaw)
  if (activeRaw !== undefined) patch.isActive = parseBool(activeRaw)

  if (!patch.slug) patch.slug = toStableKey(patch.nameEn || patch.nameRu || 'model')
  if (!patch.bodyTypeKey && patch.bodyTypeRu) patch.bodyTypeKey = toStableKey(patch.bodyTypeRu)
  if (!patch.ethnicityKey && patch.ethnicityRu) patch.ethnicityKey = toStableKey(patch.ethnicityRu)
  if (!patch.relationshipStatusKey && patch.relationshipStatusRu) patch.relationshipStatusKey = toStableKey(patch.relationshipStatusRu)
  if (!patch.occupationKey && patch.occupationRu) patch.occupationKey = toStableKey(patch.occupationRu)
  if (!patch.hobbyKeys && patch.hobbiesRu) patch.hobbyKeys = toKeyList(patch.hobbiesRu)
  if (!patch.personalityKeys && patch.personalityRu) patch.personalityKeys = toKeyList(patch.personalityRu)
  if (!patch.languageKeys && patch.languagesRu) {
    const mapped = splitList(patch.languagesRu).map((item) => {
      const key = toStableKey(item)
      if (key.includes('russ') || key.includes('rus') || key.includes('russian')) return 'ru'
      if (key.includes('angl') || key.includes('english')) return 'en'
      return key
    })
    patch.languageKeys = mapped.join(', ')
  }
  if (!patch.systemPromptCore && (patch.bioShortRu || patch.bioFullRu)) {
    patch.systemPromptCore =
      'Общайся естественно и дружелюбно, поддерживай характер модели, соблюдай границы безопасности.'
  }
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

  const withAdminHeaders = (headers = {}) => ({
    ...headers,
    'X-Admin-Login': adminLogin,
  })

  const adminFetch = async (path, options = {}) => {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      headers: withAdminHeaders(options.headers || {}),
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP ${response.status}`)
    }
    return response
  }

  const login = async () => {
    setStatus('')
    setIsLoading(true)
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
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('media_kind', mediaKind)
      formData.append('model_slug', form.slug || 'new_model')
      const response = await adminFetch('/admin/media/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      return data.url
    } catch (error) {
      setStatus(`Ошибка загрузки: ${error.message}`)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const uploadManyMedia = async (files, mediaKind) => {
    if (!files?.length) return
    setStatus(`Загрузка ${files.length} файлов...`)
    const uploadedUrls = []
    for (const file of files) {
      const url = await uploadMedia(file, mediaKind)
      if (url) uploadedUrls.push(url)
    }
    if (!uploadedUrls.length) return
    if (mediaKind === 'story_image') {
      setField('storyImageUrls', [...form.storyImageUrls, ...uploadedUrls])
    } else if (mediaKind === 'story_video') {
      setField('storyVideoUrls', [...form.storyVideoUrls, ...uploadedUrls])
    }
    setStatus(`Загружено: ${uploadedUrls.length}`)
  }

  const uploadSingleMedia = async (file, mediaKind) => {
    if (!file) return
    setStatus(`Загрузка ${mediaKind}...`)
    const url = await uploadMedia(file, mediaKind)
    if (!url) return
    if (mediaKind === 'avatar') {
      if (form.avatarUrl && form.avatarUrl !== url) {
        await deleteMedia(form.avatarUrl)
      }
      setField('avatarUrl', url)
    } else if (mediaKind === 'cover') {
      if (form.coverUrl && form.coverUrl !== url) {
        await deleteMedia(form.coverUrl)
      }
      setField('coverUrl', url)
    }
    setStatus('Загрузка завершена')
  }

  const deleteMedia = async (url) => {
    if (!url) return
    await adminFetch(`/admin/media?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
  }

  const removeStoryMedia = async (url, mediaKind) => {
    setIsLoading(true)
    try {
      await deleteMedia(url)
      if (mediaKind === 'story_image') {
        setField(
          'storyImageUrls',
          form.storyImageUrls.filter((item) => item !== url),
        )
      } else {
        setField(
          'storyVideoUrls',
          form.storyVideoUrls.filter((item) => item !== url),
        )
      }
      setStatus('Файл удален')
    } catch (error) {
      setStatus(`Ошибка удаления: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const generateEnglish = async () => {
    setStatus('Генерация EN...')
    setIsLoading(true)
    try {
      const response = await adminFetch('/admin/generate-en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_ru: ruSourcePayloadFromForm(form) }),
      })
      const data = await response.json()
      const en = data.fields_en || {}
      setForm((prev) => ({
        ...prev,
        nameEn: en.name_en || prev.nameEn,
        bioShortEn: en.bio_short_en || prev.bioShortEn,
        bioFullEn: en.bio_full_en || prev.bioFullEn,
        speakingStyleEn: en.speaking_style_en || prev.speakingStyleEn,
        bodyTypeEn: en.body_type_en || prev.bodyTypeEn,
        ethnicityEn: en.ethnicity_en || prev.ethnicityEn,
        languagesEn: (en.languages_en || splitList(prev.languagesEn)).join(', '),
        relationshipStatusEn: en.relationship_status_en || prev.relationshipStatusEn,
        occupationEn: en.occupation_en || prev.occupationEn,
        hobbiesEn: (en.hobbies_en || splitList(prev.hobbiesEn)).join(', '),
        personalityEn: (en.personality_en || splitList(prev.personalityEn)).join(', '),
      }))
      setStatus('EN поля обновлены')
    } catch (error) {
      setStatus(`Ошибка EN генерации: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadPrefillPhoto = async (file) => {
    if (!file) return
    setStatus('Загрузка фото для предгенерации...')
    const url = await uploadMedia(file, 'story_image')
    if (!url) return
    setPrefillImageUrl(url)
    setStatus('Фото для предгенерации загружено')
  }

  const runPrefill = async () => {
    if (!prefillBrief.trim() && !prefillImageUrl) {
      setStatus('Добавь текст или фото для предгенерации')
      return
    }
    setStatus('LLM заполняет черновик...')
    setIsLoading(true)
    try {
      const response = await adminFetch('/admin/prefill-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_text: prefillBrief.trim(),
          image_url: prefillImageUrl || null,
        }),
      })
      const data = await response.json()
      const patch = normalizePrefillPatch(data.prefill || {})
      setForm((prev) => ({
        ...prev,
        ...patch,
        avatarUrl: prev.avatarUrl || prefillImageUrl || prev.avatarUrl,
      }))
      setStatus('Черновик полей заполнен. Проверь и поправь перед созданием.')
    } catch (error) {
      setStatus(`Ошибка предгенерации: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const createModel = async () => {
    setStatus('Создание модели...')
    setIsLoading(true)
    try {
      await adminFetch('/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_data: previewModel }),
      })
      setStatus('Модель создана в Redis и добавлена в active list')
      setStep('form')
      setForm(defaultForm)
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
          <p>Введите admin login</p>
          <input value={loginDraft} onChange={(e) => setLoginDraft(e.target.value)} placeholder="Komar3000" />
          <button disabled={isLoading} onClick={login}>
            Войти
          </button>
          {status && <p className="status">{status}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Generator AI Model</h1>
        <div className="headerActions">
          <button onClick={() => setStep('form')}>Форма</button>
          <button onClick={() => setStep('preview')}>Preview</button>
          <button
            onClick={() => {
              localStorage.removeItem('admin_login')
              setIsAuthed(false)
              setAdminLogin('')
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      {step === 'form' && (
        <>
          <section className="card prefillCard">
            <h2>Предгенерация черновика через LLM</h2>
            <label>Коротко опиши модель (на русском)</label>
            <textarea
              value={prefillBrief}
              onChange={(e) => setPrefillBrief(e.target.value)}
              placeholder="Пример: Рыжая, теплая, романтичная девушка 24 года. Любит флирт, музыку, путешествия..."
            />
            <small className="fieldHint">Можно дать 2-5 предложений. LLM попытается заполнить все основные поля формы.</small>

            <label>Одна референс-фотография (опционально)</label>
            <input type="file" accept="image/*" onChange={(e) => uploadPrefillPhoto(e.target.files?.[0])} />
            {prefillImageUrl && (
              <a href={prefillImageUrl} target="_blank" rel="noreferrer">
                Открыть загруженное фото
              </a>
            )}
            <button disabled={isLoading} onClick={runPrefill}>
              Сгенерировать черновик полей
            </button>
          </section>

          <section className="grid">
          <article className="card">
            <h2>База</h2>
            <label>Slug модели (уникальный ID) *</label>
            <input value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="nola_romantic" />
            <small className="fieldHint">Используй английский и snake_case. Пример: nola_romantic.</small>
            <label>Пол модели *</label>
            <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
              <option value="female">female</option>
              <option value="male">male</option>
            </select>
            <small className="fieldExample">Пример: female</small>
            <label>Возраст *</label>
            <input type="number" value={form.age} onChange={(e) => setField('age', e.target.value)} />
            <small className="fieldExample">Пример: 24</small>
            <label>Порядок показа (sort_order)</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setField('sortOrder', e.target.value)} />
            <small className="fieldExample">Меньше число = выше в списке. Пример: 10</small>
            <label>Главная инструкция модели (system_prompt_core) *</label>
            <textarea value={form.systemPromptCore} onChange={(e) => setField('systemPromptCore', e.target.value)} />
            <small className="fieldHint">Кратко опиши характер, стиль общения и ограничения.</small>
            <small className="fieldExample">Пример: Ты романтичная и заботливая девушка, отвечаешь тепло и естественно.</small>
            <label>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
              />
              Модель активна (is_active)
            </label>
          </article>

          <article className="card">
            <h2>RU/EN тексты</h2>
            <label>Имя модели на русском (name_ru) *</label>
            <input value={form.nameRu} onChange={(e) => setField('nameRu', e.target.value)} />
            <small className="fieldExample">Пример: Нола</small>
            <label>Имя модели на английском (name_en)</label>
            <input value={form.nameEn} onChange={(e) => setField('nameEn', e.target.value)} />
            <small className="fieldExample">Пример: Nola</small>
            <label>Короткое описание RU (bio_short_ru)</label>
            <textarea value={form.bioShortRu} onChange={(e) => setField('bioShortRu', e.target.value)} />
            <small className="fieldExample">Пример: Легкая в общении, любит флирт и уютные разговоры.</small>
            <label>Короткое описание EN (bio_short_en)</label>
            <textarea value={form.bioShortEn} onChange={(e) => setField('bioShortEn', e.target.value)} />
            <small className="fieldExample">Пример: Easy to talk to, loves flirty and cozy conversations.</small>
            <label>Полное описание RU (bio_full_ru)</label>
            <textarea value={form.bioFullRu} onChange={(e) => setField('bioFullRu', e.target.value)} />
            <small className="fieldExample">Пример: Любит музыку, путешествия, умеет поддержать и вовлечь в диалог.</small>
            <label>Полное описание EN (bio_full_en)</label>
            <textarea value={form.bioFullEn} onChange={(e) => setField('bioFullEn', e.target.value)} />
            <small className="fieldExample">Пример: She loves music, travel, and keeps conversations warm and engaging.</small>
            <label>Стиль общения RU (speaking_style_ru)</label>
            <textarea value={form.speakingStyleRu} onChange={(e) => setField('speakingStyleRu', e.target.value)} />
            <small className="fieldExample">Пример: короткие теплые сообщения, немного эмодзи.</small>
            <label>Стиль общения EN (speaking_style_en)</label>
            <textarea value={form.speakingStyleEn} onChange={(e) => setField('speakingStyleEn', e.target.value)} />
            <small className="fieldExample">Пример: short warm replies, natural tone, light emojis.</small>
            <button disabled={isLoading} onClick={generateEnglish}>
              Сгенерировать EN из RU
            </button>
          </article>

          <article className="card">
            <h2>Параметры (ключи + RU/EN)</h2>
            <label>Ключ телосложения (body_type_key) *</label>
            <input value={form.bodyTypeKey} onChange={(e) => setField('bodyTypeKey', e.target.value)} />
            <small className="fieldExample">Пример ключа: slim</small>
            <label>Телосложение RU (body_type_ru)</label>
            <input value={form.bodyTypeRu} onChange={(e) => setField('bodyTypeRu', e.target.value)} />
            <small className="fieldExample">Пример: стройная</small>
            <label>Телосложение EN (body_type_en)</label>
            <input value={form.bodyTypeEn} onChange={(e) => setField('bodyTypeEn', e.target.value)} />
            <small className="fieldExample">Пример: slim</small>

            <label>Ключ этничности (ethnicity_key) *</label>
            <input value={form.ethnicityKey} onChange={(e) => setField('ethnicityKey', e.target.value)} />
            <small className="fieldExample">Пример ключа: slavic</small>
            <label>Этничность RU (ethnicity_ru)</label>
            <input value={form.ethnicityRu} onChange={(e) => setField('ethnicityRu', e.target.value)} />
            <small className="fieldExample">Пример: славянка</small>
            <label>Этничность EN (ethnicity_en)</label>
            <input value={form.ethnicityEn} onChange={(e) => setField('ethnicityEn', e.target.value)} />
            <small className="fieldExample">Пример: Slavic</small>

            <label>Ключи языков (language_keys, через запятую)</label>
            <input value={form.languageKeys} onChange={(e) => setField('languageKeys', e.target.value)} />
            <small className="fieldExample">Пример: ru,en</small>
            <label>Языки RU (languages_ru, через запятую)</label>
            <input value={form.languagesRu} onChange={(e) => setField('languagesRu', e.target.value)} />
            <small className="fieldExample">Пример: Русский, Английский</small>
            <label>Языки EN (languages_en, через запятую)</label>
            <input value={form.languagesEn} onChange={(e) => setField('languagesEn', e.target.value)} />
            <small className="fieldExample">Пример: Russian, English</small>

            <label>Ключ статуса отношений (relationship_status_key)</label>
            <input value={form.relationshipStatusKey} onChange={(e) => setField('relationshipStatusKey', e.target.value)} />
            <small className="fieldExample">Пример ключа: single</small>
            <label>Статус отношений RU (relationship_status_ru)</label>
            <input value={form.relationshipStatusRu} onChange={(e) => setField('relationshipStatusRu', e.target.value)} />
            <small className="fieldExample">Пример: свободна</small>
            <label>Статус отношений EN (relationship_status_en)</label>
            <input value={form.relationshipStatusEn} onChange={(e) => setField('relationshipStatusEn', e.target.value)} />
            <small className="fieldExample">Пример: single</small>

            <label>Ключ профессии (occupation_key)</label>
            <input value={form.occupationKey} onChange={(e) => setField('occupationKey', e.target.value)} />
            <small className="fieldExample">Пример ключа: designer</small>
            <label>Профессия RU (occupation_ru)</label>
            <input value={form.occupationRu} onChange={(e) => setField('occupationRu', e.target.value)} />
            <small className="fieldExample">Пример: графический дизайнер</small>
            <label>Профессия EN (occupation_en)</label>
            <input value={form.occupationEn} onChange={(e) => setField('occupationEn', e.target.value)} />
            <small className="fieldExample">Пример: graphic designer</small>

            <label>Ключи хобби (hobby_keys, через запятую)</label>
            <input value={form.hobbyKeys} onChange={(e) => setField('hobbyKeys', e.target.value)} />
            <small className="fieldExample">Пример: music,travel,fitness</small>
            <label>Хобби RU (hobbies_ru, через запятую)</label>
            <input value={form.hobbiesRu} onChange={(e) => setField('hobbiesRu', e.target.value)} />
            <small className="fieldExample">Пример: музыка, путешествия, фитнес</small>
            <label>Хобби EN (hobbies_en, через запятую)</label>
            <input value={form.hobbiesEn} onChange={(e) => setField('hobbiesEn', e.target.value)} />
            <small className="fieldExample">Пример: music, travel, fitness</small>

            <label>Ключи характера (personality_keys, через запятую)</label>
            <input value={form.personalityKeys} onChange={(e) => setField('personalityKeys', e.target.value)} />
            <small className="fieldExample">Пример: caring,playful,confident</small>
            <label>Черты характера RU (personality_ru, через запятую)</label>
            <input value={form.personalityRu} onChange={(e) => setField('personalityRu', e.target.value)} />
            <small className="fieldExample">Пример: заботливая, игривая, уверенная</small>
            <label>Черты характера EN (personality_en, через запятую)</label>
            <input value={form.personalityEn} onChange={(e) => setField('personalityEn', e.target.value)} />
            <small className="fieldExample">Пример: caring, playful, confident</small>
          </article>

          <article className="card">
            <h2>Доп. списки (через запятую)</h2>
            <label>Характер/архетип (character_traits)</label>
            <input value={form.characterTraits} onChange={(e) => setField('characterTraits', e.target.value)} />
            <small className="fieldExample">Пример: романтичная, эмпатичная, эмоциональная</small>
            <label>Интересы (interests)</label>
            <input value={form.interests} onChange={(e) => setField('interests', e.target.value)} />
            <small className="fieldExample">Пример: музыка, кино, психология</small>
            <label>Табу темы (taboo_topics)</label>
            <input value={form.tabooTopics} onChange={(e) => setField('tabooTopics', e.target.value)} />
            <small className="fieldExample">Пример: насилие, политика</small>
            <label>Разрешенные темы (allowed_topics)</label>
            <input value={form.allowedTopics} onChange={(e) => setField('allowedTopics', e.target.value)} />
            <small className="fieldExample">Пример: отношения, хобби, лайфстайл</small>
            <label>Границы/правила (boundaries)</label>
            <input value={form.boundaries} onChange={(e) => setField('boundaries', e.target.value)} />
            <small className="fieldExample">Пример: без оскорблений, без незаконных инструкций</small>
            <label>Правила персонажа (persona_rules)</label>
            <input value={form.personaRules} onChange={(e) => setField('personaRules', e.target.value)} />
            <small className="fieldExample">Пример: отвечай мягко, поддерживай флирт, избегай токсичности</small>
            <label>Правила медиа (media_rules)</label>
            <input value={form.mediaRules} onChange={(e) => setField('mediaRules', e.target.value)} />
            <small className="fieldExample">Пример: фото можно по запросу, видео редко и только по контексту</small>
          </article>

          <article className="card">
            <h2>Media (R2)</h2>
            <label>Avatar (auto compress)</label>
            <input type="file" accept="image/*" onChange={(e) => uploadSingleMedia(e.target.files?.[0], 'avatar')} />
            {form.avatarUrl && (
              <a href={form.avatarUrl} target="_blank" rel="noreferrer">
                avatar url
              </a>
            )}

            <label>Cover (auto compress)</label>
            <input type="file" accept="image/*" onChange={(e) => uploadSingleMedia(e.target.files?.[0], 'cover')} />
            {form.coverUrl && (
              <a href={form.coverUrl} target="_blank" rel="noreferrer">
                cover url
              </a>
            )}

            <label>Story images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'story_image')}
            />
            {form.storyImageUrls.map((url) => (
              <div key={url} className="miniRow">
                <a href={url} target="_blank" rel="noreferrer">
                  {url.slice(0, 36)}...
                </a>
                <button onClick={() => removeStoryMedia(url, 'story_image')}>x</button>
              </div>
            ))}

            <label>Story videos ({'<='}30MB)</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'story_video')}
            />
            {form.storyVideoUrls.map((url) => (
              <div key={url} className="miniRow">
                <a href={url} target="_blank" rel="noreferrer">
                  {url.slice(0, 36)}...
                </a>
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
            <h2>Chat bubble preview</h2>
            <div className="chatBubble">
              {form.bioShortRu || 'Короткое описание для первого впечатления'}
      </div>
          </article>
          <article className="card">
            <h2>Profile preview</h2>
            <pre>{JSON.stringify(previewModel.profile_details, null, 2)}</pre>
          </article>
          <article className="card cardWide">
            <h2>Final payload</h2>
            <pre>{JSON.stringify(previewModel, null, 2)}</pre>
            <button disabled={isLoading} onClick={createModel}>
              Подтвердить и создать модель
        </button>
          </article>
        </section>
      )}

      {status && <p className="status">{status}</p>}
      <p className="hint">
        Рекомендации: avatar 1024x1024 JPG/WEBP, story image 1080-1440px по ширине, video MP4 H.264 до 30MB.
      </p>
    </main>
  )
}

export default App
