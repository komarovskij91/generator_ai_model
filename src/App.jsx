import { useEffect, useMemo, useState } from 'react'
import './App.css'

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || 'https://web-production-c51d.up.railway.app'
const CONTENT_DRAFT_KEY = 'generator_content_draft_v1'
const FORM_DRAFT_KEY = 'generator_form_draft_v1'
const CONTENT_MAX_FILES = 30
const CONTENT_MIN_FILES = 1
const CONTENT_MAX_FILE_BYTES = 10 * 1024 * 1024
const CONTENT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const ARCHETYPE_META = [
  { key: 'alt_girl', labels: { female: 'Альтушка', male: 'Альт-парень' } },
  { key: 'student_18_plus', labels: { female: 'Студентка (18+)', male: 'Студент (18+)' } },
  { key: 'romantic', labels: { female: 'Романтичная', male: 'Романтичный' } },
  { key: 'playful', labels: { female: 'Игривый вайб', male: 'Игривый вайб' } },
  { key: 'confident', labels: { female: 'Уверенная', male: 'Уверенный' } },
  { key: 'caring', labels: { female: 'Заботливая', male: 'Заботливый' } },
  { key: 'creative', labels: { female: 'Творческая', male: 'Творческий' } },
  { key: 'sporty', labels: { female: 'Спортивная', male: 'Спортивный' } },
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

const ETHNICITY_META = [
  { key: 'european', labels: { female: 'Европейка', male: 'Европеец' } },
  { key: 'east_asian', labels: { female: 'Восточноазиатская', male: 'Восточноазиатский' } },
  { key: 'black', labels: { female: 'Чернокожая', male: 'Чернокожий' } },
  { key: 'latina', labels: { female: 'Латиноамериканка', male: 'Латиноамериканец' } },
]

const pickGenderLabel = (labels, gender) => labels?.[gender] || labels?.female || labels?.male || ''

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
  avatarVideoUrl: '',
  coverUrl: '',
  storyImageUrls: [],
  storyVideoUrls: [],
  chatImageUrls: [],
  chatVideoUrls: [],
  profileImageUrls: [],
  generatedMediaGroups: [],
  sortOrder: 100,
  isActive: true,
  schemaVersion: 4,
  createdBy: 'generator_web',
  source: 'generator_web',
}

const readJsonStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
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
    avatar_video_url: form.avatarVideoUrl || null,
    cover_url: form.coverUrl || null,
    story_image_urls: form.storyImageUrls,
    story_video_urls: form.storyVideoUrls,
    chat_image_urls: form.chatImageUrls,
    chat_video_urls: form.chatVideoUrls,
    profile_image_urls: form.profileImageUrls,
  },
  generated_media_groups: form.generatedMediaGroups,
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
  const [form, setForm] = useState(() => ({ ...defaultForm, ...readJsonStorage(FORM_DRAFT_KEY).form }))
  const [step, setStep] = useState(() => readJsonStorage(FORM_DRAFT_KEY).step || 'form')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mainTab, setMainTab] = useState('generator')
  const [pushCandidates, setPushCandidates] = useState([])
  const [pushTitle, setPushTitle] = useState('Noloo')
  const [pushBody, setPushBody] = useState('Тестовое уведомление')
  const [pushModelId, setPushModelId] = useState('')
  const [pushModelManual, setPushModelManual] = useState('')
  const [pushModelsList, setPushModelsList] = useState([])
  const [pushSelected, setPushSelected] = useState({})
  const [pushLog, setPushLog] = useState([])
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSending, setPushSending] = useState(false)
  const [prefillBrief, setPrefillBrief] = useState(() => readJsonStorage(FORM_DRAFT_KEY).prefillBrief || '')
  const [prefillImageUrl, setPrefillImageUrl] = useState(() => readJsonStorage(FORM_DRAFT_KEY).prefillImageUrl || '')
  const [prefillGender, setPrefillGender] = useState(() => readJsonStorage(FORM_DRAFT_KEY).prefillGender || 'female')
  const [contentSessionId, setContentSessionId] = useState(
    () => JSON.parse(localStorage.getItem(CONTENT_DRAFT_KEY) || '{}').contentSessionId || ''
  )
  const [contentPromptGroups, setContentPromptGroups] = useState(
    () => JSON.parse(localStorage.getItem(CONTENT_DRAFT_KEY) || '{}').contentPromptGroups || []
  )
  const [contentSelection, setContentSelection] = useState(
    () => JSON.parse(localStorage.getItem(CONTENT_DRAFT_KEY) || '{}').contentSelection || {}
  )
  const [pastedContentFiles, setPastedContentFiles] = useState([])
  const previewModel = useMemo(() => modelDataFromForm(form), [form])
  const archetypeOptions = useMemo(
    () => ARCHETYPE_META.map((item) => ({ key: item.key, label: pickGenderLabel(item.labels, form.gender) })),
    [form.gender]
  )
  const ethnicityOptions = useMemo(
    () => ETHNICITY_META.map((item) => ({ key: item.key, label: pickGenderLabel(item.labels, form.gender) })),
    [form.gender]
  )

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const dedupe = (items) => Array.from(new Set((items || []).filter(Boolean)))
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

  const appendPushLog = (level, message, detail) => {
    setPushLog((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ts: new Date().toLocaleString('ru-RU'),
          level,
          message,
          detail,
        },
        ...prev,
      ].slice(0, 200)
    )
  }

  const effectivePushModelId = () => {
    const manual = pushModelManual.trim()
    if (manual) return manual
    return pushModelId.trim()
  }

  const loadPushCandidates = async () => {
    setPushLoading(true)
    appendPushLog('info', 'Загрузка пользователей с устройствами и каталога моделей…')
    try {
      const response = await adminFetch('/admin/push/candidates')
      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      setPushCandidates(items)
      appendPushLog('ok', `Пользователей с устройствами: ${items.length}`)
    } catch (error) {
      appendPushLog('err', `Список пользователей не загружен: ${error.message}`)
    }
    try {
      const mResponse = await fetch(`${BACKEND_BASE_URL}/models/active`)
      const raw = await mResponse.text()
      if (!mResponse.ok) throw new Error(raw)
      const mData = JSON.parse(raw)
      const models = Array.isArray(mData) ? mData : []
      setPushModelsList(models)
      appendPushLog('ok', `Моделей в каталоге: ${models.length}`)
    } catch (error) {
      appendPushLog('warn', `Каталог моделей не загружен: ${error.message}`)
    } finally {
      setPushLoading(false)
    }
  }

  const togglePushUser = (userId) => {
    setPushSelected((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const selectAllPushUsers = () => {
    const next = {}
    pushCandidates.forEach((c) => {
      next[c.user_id] = true
    })
    setPushSelected(next)
  }

  const clearPushSelection = () => setPushSelected({})

  const sendAdminTestPush = async () => {
    const userIds = Object.entries(pushSelected)
      .filter(([, on]) => on)
      .map(([id]) => id)
    if (!userIds.length) {
      appendPushLog('warn', 'Отметьте галочками хотя бы одного пользователя ниже')
      return
    }
    setPushSending(true)
    const modelIdForSend = effectivePushModelId() || null
    if (!modelIdForSend) {
      appendPushLog(
        'warn',
        'Модель не выбрана: уйдёт обычный alert без NSE (не будет Communication Notifications и диплинка в чат).'
      )
    } else {
      appendPushLog(
        'info',
        'В payload: chat_model_id (+ при наличии в Redis: chat_model_avatar_url, chat_model_name), aps.mutable-content=1 → Noloo NotificationService (communication).'
      )
    }
    appendPushLog('info', `Отправка тестового push (${userIds.length} польз.)…`, {
      title: pushTitle,
      body: pushBody,
      model_id: modelIdForSend,
      user_ids: userIds,
    })
    try {
      const response = await adminFetch('/admin/push/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: userIds,
          title: pushTitle.trim() || null,
          body: pushBody.trim() || null,
          model_id: modelIdForSend,
        }),
      })
      const data = await response.json()
      const results = Array.isArray(data.results) ? data.results : []
      results.forEach((row) => {
        if (row.error) {
          appendPushLog('err', `${row.user_id}: ошибка`, row)
        } else {
          appendPushLog(row.failed > 0 ? 'warn' : 'ok', `${row.user_id}: sent=${row.sent} failed=${row.failed}`, row)
        }
      })
      appendPushLog('info', `Ответ обработан, записей: ${results.length}`)
    } catch (error) {
      appendPushLog('err', `Запрос send-test: ${error.message}`)
    } finally {
      setPushSending(false)
    }
  }

  useEffect(() => {
    if (!isAuthed || mainTab !== 'notifications') return
    loadPushCandidates()
    // Перезагрузка списка только при смене вкладки / авторизации; не привязываемся к телу loadPushCandidates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, mainTab])

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
      if (mediaKind === 'avatar_video') setField('avatarVideoUrl', url)
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
      if (mediaKind === 'chat_image') setField('chatImageUrls', [...form.chatImageUrls, ...urls])
      if (mediaKind === 'chat_video') setField('chatVideoUrls', [...form.chatVideoUrls, ...urls])
    } finally {
      setIsLoading(false)
    }
  }

  const removeStoryMedia = async (url, mediaKind) => {
    await adminFetch(`/admin/media?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
    if (mediaKind === 'story_image') {
      setField('storyImageUrls', form.storyImageUrls.filter((item) => item !== url))
    } else if (mediaKind === 'story_video') {
      setField('storyVideoUrls', form.storyVideoUrls.filter((item) => item !== url))
    } else if (mediaKind === 'chat_image') {
      setField('chatImageUrls', form.chatImageUrls.filter((item) => item !== url))
    } else if (mediaKind === 'chat_video') {
      setField('chatVideoUrls', form.chatVideoUrls.filter((item) => item !== url))
    }
  }

  const uploadPrefillPhoto = async (file) => {
    const url = await uploadMedia(file, 'story_image')
    if (url) setPrefillImageUrl(url)
  }

  const createContentSession = async () => {
    if (!prefillImageUrl) {
      throw new Error('Сначала добавь референс-фото в блоке Предгенерация')
    }
    const response = await adminFetch('/admin/content/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_image_url: prefillImageUrl,
        brief_text: prefillBrief.trim(),
      }),
    })
    const data = await response.json()
    setContentSessionId(data.session_id || '')
    setContentPromptGroups(Array.isArray(data.prompt_groups) ? data.prompt_groups : [])
    return data.session_id || ''
  }

  const ensureContentSession = async () => {
    if (!contentSessionId) {
      return createContentSession()
    }
    try {
      const response = await adminFetch(`/admin/content/session/${contentSessionId}`)
      const data = await response.json()
      if ((data.reference_image_url || '') !== prefillImageUrl) {
        return createContentSession()
      }
      return contentSessionId
    } catch {
      return createContentSession()
    }
  }

  const runPrefill = async () => {
    if (!prefillImageUrl) {
      setStatus('Референс-фото обязательно')
      return
    }
    setIsLoading(true)
    setStatus('Предгенерация...')
    try {
      const response = await adminFetch('/admin/prefill-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_text: prefillBrief.trim(),
          image_url: prefillImageUrl || null,
          preferred_gender: prefillGender,
        }),
      })
      const data = await response.json()
      const patch = normalizePrefillPatch(data.prefill || {})
      setForm((prev) => ({ ...prev, ...patch, avatarUrl: prev.avatarUrl || prefillImageUrl || '' }))
      await ensureContentSession()
      setStatus('Черновик заполнен')
    } catch (error) {
      setStatus(`Ошибка предгенерации: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const onPasteContentPhotos = (event) => {
    const items = Array.from(event.clipboardData?.items || [])
    const imageFiles = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean)
    if (!imageFiles.length) {
      setStatus('В буфере нет изображений')
      return
    }
    const invalidType = imageFiles.find((file) => !CONTENT_ALLOWED_TYPES.has(file.type))
    if (invalidType) {
      setStatus(`Неверный формат: ${invalidType.name}. Разрешено: jpg/png/webp`)
      return
    }
    const tooBig = imageFiles.find((file) => file.size > CONTENT_MAX_FILE_BYTES)
    if (tooBig) {
      setStatus(`Файл больше 10MB: ${tooBig.name}`)
      return
    }
    const next = [...pastedContentFiles, ...imageFiles]
    if (next.length > CONTENT_MAX_FILES) {
      setStatus(`Можно вставить максимум ${CONTENT_MAX_FILES} файлов`)
      return
    }
    setPastedContentFiles(next)
    setStatus(`Добавлено фото: ${imageFiles.length}. Всего: ${next.length}`)
  }

  const clearPastedPhotos = () => {
    setPastedContentFiles([])
  }

  const pollContentSession = async (sessionId, attempts = 50) => {
    if (!sessionId || attempts <= 0) return
    try {
      const response = await adminFetch(`/admin/content/session/${sessionId}`)
      const data = await response.json()
      const groups = Array.isArray(data.prompt_groups) ? data.prompt_groups : []
      setContentPromptGroups(groups)
      const hasActive = groups.some((item) => item.status === 'running')
      if (hasActive) {
        setTimeout(() => {
          pollContentSession(sessionId, attempts - 1)
        }, 3500)
      }
    } catch {
      // ignore polling errors to not block manual refresh
    }
  }

  const generateContentPrompts = async () => {
    if (pastedContentFiles.length < CONTENT_MIN_FILES || pastedContentFiles.length > CONTENT_MAX_FILES) {
      setStatus(`Нужно вставить от ${CONTENT_MIN_FILES} до ${CONTENT_MAX_FILES} фото`)
      return
    }
    setIsLoading(true)
    setStatus('Генерирую промты...')
    try {
      const sessionId = await ensureContentSession()
      const formData = new FormData()
      pastedContentFiles.forEach((file) => formData.append('files', file))
      const response = await adminFetch(`/admin/content/session/${sessionId}/generate-prompts`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      setContentPromptGroups(Array.isArray(data.prompt_groups) ? data.prompt_groups : [])
      setStatus(`Промты готовы: ${Array.isArray(data.prompt_groups) ? data.prompt_groups.length : 0}`)
    } catch (error) {
      setStatus(`Ошибка генерации промтов: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const startKlingForPrompt = async (promptId) => {
    if (!contentSessionId) {
      setStatus('Сначала создай контент-сессию')
      return
    }
    setIsLoading(true)
    try {
      await adminFetch(`/admin/content/session/${contentSessionId}/kling/${promptId}/start`, {
        method: 'POST',
      })
      setStatus('Kling-задача запущена')
      pollContentSession(contentSessionId, 120)
    } catch (error) {
      setStatus(`Ошибка запуска Kling: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleGeneratedSelection = (promptId, url, target) => {
    const key = `${promptId}|||${url}`
    setContentSelection((prev) => {
      const current = prev[key] || { story: false, chat: false, profile: false }
      const nextItem = { ...current, [target]: !current[target] }
      return { ...prev, [key]: nextItem }
    })
  }

  const applyGeneratedMedia = async () => {
    if (!contentSessionId) {
      setStatus('Нет контент-сессии')
      return
    }
    const selected = Object.entries(contentSelection)
      .map(([compoundKey, flags]) => {
        const [promptId, url] = compoundKey.split('|||')
        const targets = []
        if (flags.story) targets.push('story')
        if (flags.chat) targets.push('chat')
        if (flags.profile) targets.push('profile')
        return { prompt_id: promptId, url, targets }
      })
      .filter((item) => item.targets.length > 0)
    if (!selected.length) {
      setStatus('Отметь хотя бы одну картинку чекбоксами')
      return
    }
    setIsLoading(true)
    setStatus('Применяю и загружаю в R2...')
    try {
      const response = await adminFetch(`/admin/content/session/${contentSessionId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected,
          model_slug: form.slug || 'new_model',
        }),
      })
      const data = await response.json()
      const patch = data.patch || {}
      const media = patch.story_media || {}
      setForm((prev) => ({
        ...prev,
        storyImageUrls: dedupe([...(prev.storyImageUrls || []), ...(media.story_image_urls || [])]),
        chatImageUrls: dedupe([...(prev.chatImageUrls || []), ...(media.chat_image_urls || [])]),
        profileImageUrls: dedupe([...(prev.profileImageUrls || []), ...(media.profile_image_urls || [])]),
        generatedMediaGroups: patch.generated_media_groups || prev.generatedMediaGroups,
      }))
      if (data.session?.prompt_groups) {
        setContentPromptGroups(data.session.prompt_groups)
      }
      setStatus('Готово: payload обновлен')
    } catch (error) {
      setStatus(`Ошибка apply: ${error.message}`)
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
      setPastedContentFiles([])
      setContentSessionId('')
      setContentPromptGroups([])
      setContentSelection({})
      localStorage.removeItem(CONTENT_DRAFT_KEY)
      localStorage.removeItem(FORM_DRAFT_KEY)
      setStep('form')
    } catch (error) {
      setStatus(`Ошибка создания: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem(
      CONTENT_DRAFT_KEY,
      JSON.stringify({
        contentSessionId,
        contentPromptGroups,
        contentSelection,
      })
    )
  }, [contentSessionId, contentPromptGroups, contentSelection])

  useEffect(() => {
    localStorage.setItem(
      FORM_DRAFT_KEY,
      JSON.stringify({
        form,
        prefillBrief,
        prefillImageUrl,
        prefillGender,
        step,
      })
    )
  }, [form, prefillBrief, prefillImageUrl, prefillGender, step])

  const resetAllDraftData = () => {
    const confirmed = window.confirm('Сбросить все заполненные данные и начать новую генерацию?')
    if (!confirmed) return
    setForm(defaultForm)
    setStep('form')
    setStatus('')
    setPrefillBrief('')
    setPrefillImageUrl('')
    setPrefillGender('female')
    setPastedContentFiles([])
    setContentSessionId('')
    setContentPromptGroups([])
    setContentSelection({})
    localStorage.removeItem(FORM_DRAFT_KEY)
    localStorage.removeItem(CONTENT_DRAFT_KEY)
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
        <div className="headerBrand">
          <h1>Generator AI Model (v4)</h1>
          <nav className="topTabs" aria-label="Разделы">
            <button
              type="button"
              className={mainTab === 'generator' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('generator')}
            >
              Генератор
            </button>
            <button
              type="button"
              className={mainTab === 'notifications' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('notifications')}
            >
              Уведомления
            </button>
          </nav>
        </div>
        <div className="headerActions">
          {mainTab === 'generator' && (
            <>
              <button type="button" onClick={() => setStep('form')}>Форма</button>
              <button type="button" onClick={() => setStep('preview')}>Preview</button>
              <button type="button" onClick={resetAllDraftData}>Новая генерация</button>
            </>
          )}
          {mainTab === 'notifications' && (
            <button type="button" disabled={pushLoading} onClick={loadPushCandidates}>
              Обновить список
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('admin_login')
              setIsAuthed(false)
            }}
          >
            Выйти
          </button>
        </div>
      </header>

      {mainTab === 'notifications' && (
        <section className="card notificationsPanel">
          <h2>Тестовые push-уведомления</h2>
          <p className="fieldHint">
            Заполните заголовок и текст, отметьте пользователей и нажмите «Отправить». Чтобы проверить{' '}
            <strong>Communication Notifications</strong> (большой аватар + бейдж приложения), обязательно выберите модель
            или укажите <code>model_id</code> вручную и тестируйте на <strong>реальном устройстве</strong> (не симулятор).
          </p>
          <label htmlFor="push-title">Заголовок</label>
          <input
            id="push-title"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            placeholder="Noloo"
          />
          <label htmlFor="push-body">Текст уведомления</label>
          <textarea
            id="push-body"
            rows={4}
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            placeholder="Короткий текст на экране уведомления"
          />
          <label htmlFor="push-model-select">От какой модели</label>
          <select
            id="push-model-select"
            value={pushModelManual ? '' : pushModelId}
            onChange={(e) => {
              setPushModelId(e.target.value)
              setPushModelManual('')
            }}
          >
            <option value="">— Не выбрано (только заголовок выше) —</option>
            {pushModelsList.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.name && String(m.name).trim()) || m.id} · {m.id}
              </option>
            ))}
          </select>
          <label htmlFor="push-model-manual">Или model_id вручную</label>
          <input
            id="push-model-manual"
            value={pushModelManual}
            onChange={(e) => setPushModelManual(e.target.value)}
            placeholder="slug, если модели нет в списке (имеет приоритет над выбором)"
          />
          <small className="fieldHint">
            С моделью: бэкенд подставит имя в заголовок и отправит <code>chat_model_id</code>,{' '}
            <code>chat_model_name</code>, при наличии в данных модели — <code>chat_model_avatar_url</code> (https), плюс{' '}
            <code>aps.mutable-content: 1</code> чтобы запустился Notification Service и собрался communication-push.
            Тап по уведомлению открывает чат с этой моделью в приложении.
          </small>
          <button type="button" className="primaryAction" disabled={pushSending} onClick={sendAdminTestPush}>
            {pushSending ? 'Отправка…' : 'Отправить'}
          </button>

          <div className="pushListHeader">
            <h3>Пользователи с устройствами для push</h3>
            <div className="miniRow">
              <button type="button" onClick={selectAllPushUsers} disabled={!pushCandidates.length}>
                Выбрать всех
              </button>
              <button type="button" onClick={clearPushSelection}>
                Снять все
              </button>
            </div>
          </div>
          {pushLoading && <p className="status">Загрузка списка…</p>}
          {!pushLoading && !pushCandidates.length && (
            <p className="fieldHint">Пока никого нет. Откройте приложение, разрешите уведомления и нажмите «Обновить список».</p>
          )}
          <ul className="pushUserList">
            {pushCandidates.map((u) => (
              <li key={u.user_id}>
                <label className="pushUserRow">
                  <input
                    type="checkbox"
                    checked={Boolean(pushSelected[u.user_id])}
                    onChange={() => togglePushUser(u.user_id)}
                  />
                  <span className="pushUserId">{u.user_id}</span>
                  {u.name ? <span className="pushUserName">{u.name}</span> : null}
                  <span className="pushDeviceCount">{u.devices_count} устр.</span>
                </label>
              </li>
            ))}
          </ul>

          <h3>Лог отправки и отладка</h3>
          <div className="pushLog" role="log" aria-live="polite">
            {pushLog.length === 0 && <p className="fieldHint">Здесь появятся записи о загрузке списка и результатах APNS.</p>}
            {pushLog.map((entry) => (
              <pre key={entry.id} className={`pushLogLine pushLog-${entry.level}`}>
                [{entry.ts}] {entry.message}
                {entry.detail != null ? `\n${JSON.stringify(entry.detail, null, 2)}` : ''}
              </pre>
            ))}
          </div>
          <button type="button" className="secondaryMuted" onClick={() => setPushLog([])}>
            Очистить лог
          </button>
        </section>
      )}

      {mainTab === 'generator' && step === 'form' && (
        <>
          <section className="card prefillCard">
            <h2>Предгенерация через LLM</h2>
            <label>Короткое описание (RU)</label>
            <textarea value={prefillBrief} onChange={(e) => setPrefillBrief(e.target.value)} />
            <small className="fieldHint">Что это: свободный текст для первичного автозаполнения.</small>
            <small className="fieldExample">Пример: Брюнетка 25 лет, уверенная, любит музыку и путешествия.</small>
            <label>1 фото-референс (обязательно)</label>
            <input type="file" accept="image/*" onChange={(e) => uploadPrefillPhoto(e.target.files?.[0])} />
            <label>Кого заполняем (для prefill)</label>
            <div className="miniRow">
              <label>
                <input
                  type="radio"
                  name="prefillGender"
                  value="female"
                  checked={prefillGender === 'female'}
                  onChange={(e) => setPrefillGender(e.target.value)}
                />
                женщина
              </label>
              <label>
                <input
                  type="radio"
                  name="prefillGender"
                  value="male"
                  checked={prefillGender === 'male'}
                  onChange={(e) => setPrefillGender(e.target.value)}
                />
                мужчина
              </label>
            </div>
            {prefillImageUrl && <a href={prefillImageUrl} target="_blank" rel="noreferrer">Открыть фото</a>}
            <button disabled={isLoading} onClick={runPrefill}>Сгенерировать черновик</button>
            <small className="fieldHint">Это же фото используется как основной референс для Kling.</small>
          </section>

          <section className="card prefillCard">
            <h2>Генерация контента для модели</h2>
            <label>Вставка фото (только Ctrl+V, 1-30 шт, jpg/png/webp, до 10MB)</label>
            <div className="pasteZone" onPaste={onPasteContentPhotos} tabIndex={0}>
              Нажми сюда и вставь фотографии через Ctrl+V
            </div>
            <div className="miniRow">
              <span>Добавлено: {pastedContentFiles.length}</span>
              <button type="button" onClick={clearPastedPhotos}>Очистить</button>
            </div>
            <button disabled={isLoading || !prefillImageUrl} onClick={generateContentPrompts}>
              Сгенерировать промты по фото
            </button>
            {!!contentPromptGroups.length && (
              <div className="contentPromptList">
                {contentPromptGroups.map((group) => (
                  <article key={group.id} className="contentPromptCard">
                    <div className="miniRow">
                      <strong>Промт {Number(group.index || 0) + 1}</strong>
                      <span>{group.status_ru || '—'}</span>
                    </div>
                    <p>{group.prompt_ru || group.prompt}</p>
                    <button
                      type="button"
                      disabled={isLoading || ['queued', 'running'].includes(group.status)}
                      onClick={() => startKlingForPrompt(group.id)}
                    >
                      Сгенерировать контент
                    </button>
                    {!!group.kling_output_urls?.length && (
                      <div className="generatedGrid">
                        {group.kling_output_urls.map((url) => {
                          const key = `${group.id}|||${url}`
                          const checked = contentSelection[key] || { story: false, chat: false, profile: false }
                          return (
                            <div key={url} className="generatedItem">
                              <img src={url} alt="generated" />
                              <label><input type="checkbox" checked={checked.story} onChange={() => toggleGeneratedSelection(group.id, url, 'story')} /> сторис</label>
                              <label><input type="checkbox" checked={checked.chat} onChange={() => toggleGeneratedSelection(group.id, url, 'chat')} /> фото для чата</label>
                              <label><input type="checkbox" checked={checked.profile} onChange={() => toggleGeneratedSelection(group.id, url, 'profile')} /> фото для профиля</label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {group.error && <small className="fieldHint">Ошибка: {String(group.error)}</small>}
                  </article>
                ))}
              </div>
            )}
            <button disabled={isLoading || !contentPromptGroups.length} onClick={applyGeneratedMedia}>
              Применить (R2 + Payload)
            </button>
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
                {archetypeOptions.map((item) => (
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
                {ethnicityOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
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
              <label>Видео-аватар (`story_media.avatar_video_url`)</label>
              <input type="file" accept="video/*" onChange={(e) => uploadSingleMedia(e.target.files?.[0], 'avatar_video')} />
              {form.avatarVideoUrl && <a href={form.avatarVideoUrl} target="_blank" rel="noreferrer">avatar video url</a>}
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
              <label>Фото для чата (`story_media.chat_image_urls[]`)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'chat_image')} />
              {form.chatImageUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                  <button onClick={() => removeStoryMedia(url, 'chat_image')}>x</button>
      </div>
              ))}
              <label>Фото для профиля (`story_media.profile_image_urls[]`)</label>
              {form.profileImageUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                </div>
              ))}
              <label>Видео для чата (`story_media.chat_video_urls[]`, {'<='}30MB)</label>
              <input type="file" accept="video/*" multiple onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'chat_video')} />
              {form.chatVideoUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                  <button onClick={() => removeStoryMedia(url, 'chat_video')}>x</button>
      </div>
              ))}
              <small className="fieldHint">Эти фото модель будет отправлять в чате при запросе пользователя.</small>
            </article>
          </section>
        </>
      )}

      {mainTab === 'generator' && step === 'preview' && (
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

      {mainTab === 'generator' && status && <p className="status">{status}</p>}
    </main>
  )
}

export default App
