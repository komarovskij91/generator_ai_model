import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import FeedPostsTab from './FeedPostsTab'

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || 'https://web-production-c51d.up.railway.app'
const CONTENT_DRAFT_KEY = 'generator_content_draft_v1'
const FORM_DRAFT_KEY = 'generator_form_draft_v1'
const CONTENT_MAX_FILES = 200
const CONTENT_MIN_FILES = 1
const CONTENT_MAX_FILE_BYTES = 10 * 1024 * 1024
const CONTENT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const CONTENT_ACTIVE_STATUSES = new Set(['prompt_queued', 'prompt_running', 'queued', 'running'])

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

const MODEL_LOCALES = [
  { key: 'ru', suffix: 'Ru', label: 'RU' },
  { key: 'en', suffix: 'En', label: 'EN' },
  { key: 'de', suffix: 'De', label: 'DE' },
  { key: 'fr', suffix: 'Fr', label: 'FR' },
  { key: 'pt', suffix: 'Pt', label: 'PT' },
  { key: 'es', suffix: 'Es', label: 'ES' },
]

const EXTRA_MODEL_LOCALES = MODEL_LOCALES.filter((item) => item.key !== 'ru' && item.key !== 'en')

const localizedTextFromForm = (form, base) =>
  Object.fromEntries(MODEL_LOCALES.map(({ key, suffix }) => [key, form[`${base}${suffix}`] || '']))

const localizedListFromForm = (form, base) =>
  Object.fromEntries(MODEL_LOCALES.map(({ key, suffix }) => [key, splitList(form[`${base}${suffix}`])]))

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
  nameDe: '',
  nameFr: '',
  namePt: '',
  nameEs: '',
  gender: 'female',
  age: 24,
  targetAgeGroup: 'younger',
  archetypeKeys: [],
  ethnicityKey: 'european',
  interestKeys: [],
  bioShortRu: '',
  bioShortEn: '',
  bioShortDe: '',
  bioShortFr: '',
  bioShortPt: '',
  bioShortEs: '',
  bioFullRu: '',
  bioFullEn: '',
  bioFullDe: '',
  bioFullFr: '',
  bioFullPt: '',
  bioFullEs: '',
  speakingStyleRu: '',
  speakingStyleEn: '',
  speakingStyleDe: '',
  speakingStyleFr: '',
  speakingStylePt: '',
  speakingStyleEs: '',
  likesRu: '',
  likesEn: '',
  likesDe: '',
  likesFr: '',
  likesPt: '',
  likesEs: '',
  allowedTopics: '',
  tabooTopics: '',
  systemPromptCore: '',
  avatarUrl: '',
  avatarVideoUrl: '',
  avatarVideoMobileUrl: '',
  coverUrl: '',
  storyImageUrls: [],
  storyVideoUrls: [],
  chatImageUrls: [],
  chatVideoUrls: [],
  profileImageUrls: [],
  mediaFlags: {},
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
  name_i18n: localizedTextFromForm(form, 'name'),
  age: Number(form.age),
  gender: form.gender,
  target_age_group: form.targetAgeGroup,
  archetype_keys: form.archetypeKeys,
  ethnicity_key: form.ethnicityKey,
  interest_keys: form.interestKeys,
  interests: form.interestKeys,
  bio_short_i18n: localizedTextFromForm(form, 'bioShort'),
  bio_full_i18n: localizedTextFromForm(form, 'bioFull'),
  speaking_style_i18n: localizedTextFromForm(form, 'speakingStyle'),
  likes_i18n: localizedListFromForm(form, 'likes'),
  allowed_topics: splitList(form.allowedTopics),
  taboo_topics: splitList(form.tabooTopics),
  system_prompt_core: form.systemPromptCore,
  story_media: {
    avatar_url: form.avatarUrl || null,
    avatar_video_url: form.avatarVideoUrl || null,
    avatar_video_mobile_url: form.avatarVideoMobileUrl || null,
    cover_url: form.coverUrl || null,
    story_image_urls: form.storyImageUrls,
    story_video_urls: form.storyVideoUrls,
    chat_image_urls: form.chatImageUrls,
    chat_video_urls: form.chatVideoUrls,
    profile_image_urls: form.profileImageUrls,
  },
  media_flags: form.mediaFlags || {},
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
    allowedTopics: asString(prefill.allowedTopics || prefill.allowed_topics),
    tabooTopics: asString(prefill.tabooTopics || prefill.taboo_topics),
    systemPromptCore: asString(prefill.systemPromptCore || prefill.system_prompt_core),
    ethnicityKey: asString(prefill.ethnicityKey || prefill.ethnicity_key) || 'european',
    targetAgeGroup: asString(prefill.targetAgeGroup || prefill.target_age_group) || 'younger',
    archetypeKeys: toArray(prefill.archetypeKeys || prefill.archetype_keys),
    interestKeys: toArray(prefill.interestKeys || prefill.interest_keys),
  }
  MODEL_LOCALES.forEach(({ key, suffix }) => {
    patch[`name${suffix}`] = asString(prefill[`name${suffix}`] || prefill[`name_${key}`])
    patch[`bioShort${suffix}`] = asString(prefill[`bioShort${suffix}`] || prefill[`bio_short_${key}`])
    patch[`bioFull${suffix}`] = asString(prefill[`bioFull${suffix}`] || prefill[`bio_full_${key}`])
    patch[`speakingStyle${suffix}`] = asString(prefill[`speakingStyle${suffix}`] || prefill[`speaking_style_${key}`])
    patch[`likes${suffix}`] = asString(prefill[`likes${suffix}`] || prefill[`likes_${key}`])
  })
  if ('age' in prefill && !Number.isNaN(Number(prefill.age))) {
    patch.age = Number(prefill.age)
  }
  if (!patch.slug) patch.slug = toStableKey(patch.nameEn || patch.nameRu || 'model')
  return patch
}

/** Обратное преобразование документа из Redis → локальная форма генератора. */
const formFromRedisModel = (doc) => {
  const sm = doc.story_media || {}
  const nameI = doc.name_i18n || {}
  const bioS = doc.bio_short_i18n || {}
  const bioF = doc.bio_full_i18n || {}
  const sp = doc.speaking_style_i18n || {}
  const likes = doc.likes_i18n || {}
  const result = {
    ...defaultForm,
    slug: doc.slug || '',
    gender: doc.gender || 'female',
    age: doc.age != null ? Number(doc.age) : defaultForm.age,
    targetAgeGroup: doc.target_age_group || defaultForm.targetAgeGroup,
    archetypeKeys: Array.isArray(doc.archetype_keys) ? [...doc.archetype_keys] : [],
    ethnicityKey: doc.ethnicity_key || 'european',
    interestKeys: Array.isArray(doc.interest_keys) ? [...doc.interest_keys] : [],
    allowedTopics: Array.isArray(doc.allowed_topics) ? doc.allowed_topics.join(', ') : '',
    tabooTopics: Array.isArray(doc.taboo_topics) ? doc.taboo_topics.join(', ') : '',
    systemPromptCore: doc.system_prompt_core || '',
    avatarUrl: sm.avatar_url || doc.avatar_url || '',
    avatarVideoUrl: sm.avatar_video_url || '',
    avatarVideoMobileUrl: sm.avatar_video_mobile_url || '',
    coverUrl: sm.cover_url || '',
    storyImageUrls: [...(sm.story_image_urls || [])],
    storyVideoUrls: [...(sm.story_video_urls || [])],
    chatImageUrls: [...(sm.chat_image_urls || [])],
    chatVideoUrls: [...(sm.chat_video_urls || [])],
    profileImageUrls: [...(sm.profile_image_urls || [])],
    mediaFlags: { ...(doc.media_flags || {}) },
    generatedMediaGroups: Array.isArray(doc.generated_media_groups) ? doc.generated_media_groups : [],
    sortOrder: doc.sort_order != null ? Number(doc.sort_order) : defaultForm.sortOrder,
    isActive: doc.is_active !== false,
    schemaVersion: doc.schema_version != null ? Number(doc.schema_version) : defaultForm.schemaVersion,
    createdBy: doc.created_by || defaultForm.createdBy,
    source: doc.source || defaultForm.source,
  }
  MODEL_LOCALES.forEach(({ key, suffix }) => {
    result[`name${suffix}`] = nameI[key] || (key === 'ru' ? doc.name : '') || ''
    result[`bioShort${suffix}`] = bioS[key] || (key === 'ru' ? doc.bio_short : '') || ''
    result[`bioFull${suffix}`] = bioF[key] || (key === 'ru' ? doc.bio_full : '') || ''
    result[`speakingStyle${suffix}`] = sp[key] || (key === 'ru' ? doc.speaking_style : '') || ''
    result[`likes${suffix}`] = Array.isArray(likes[key]) ? likes[key].join(', ') : ''
  })
  return result
}

function ContentSettingsTab({ adminFetch, isActive }) {
  const [settings, setSettings] = useState({ hide_adult_content: false })
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      const response = await adminFetch('/admin/content-settings')
      const data = await response.json()
      setSettings({ hide_adult_content: Boolean(data.hide_adult_content) })
      setStatus('Настройки загружены')
    } catch (error) {
      setStatus(`Ошибка настроек: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }, [adminFetch])

  useEffect(() => {
    if (isActive) refresh()
  }, [isActive, refresh])

  const updateHideAdult = async (checked) => {
    setBusy(true)
    try {
      const response = await adminFetch('/admin/content-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hide_adult_content: checked }),
      })
      const data = await response.json()
      setSettings({ hide_adult_content: Boolean(data.hide_adult_content) })
      setStatus(checked ? 'Эротика скрыта в приложении' : 'Эротика снова разрешена к выдаче')
    } catch (error) {
      setStatus(`Сохранение настроек: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Настройки контента</h2>
      <p className="fieldHint">
        Настройка применяется на backend для всех пользователей. Когда она включена, приложение не получает контент,
        отмеченный как эротика.
      </p>
      <label className="flagToggle">
        <input
          type="checkbox"
          checked={settings.hide_adult_content}
          disabled={busy}
          onChange={(event) => updateHideAdult(event.target.checked)}
        />
        <span>Скрывать эротику в приложении</span>
      </label>
      <button type="button" disabled={busy} onClick={refresh}>Обновить</button>
      {status ? <p className="status">{status}</p> : null}
    </section>
  )
}

function ContentModerationTab({ adminFetch, isActive }) {
  const [models, setModels] = useState([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const loadModels = useCallback(async () => {
    const response = await adminFetch('/admin/models')
    const data = await response.json()
    const items = Array.isArray(data.items) ? data.items : []
    setModels(items)
    if (!selectedModelId && items[0]?.id) setSelectedModelId(items[0].id)
  }, [adminFetch, selectedModelId])

  const loadContent = useCallback(async (modelId = selectedModelId) => {
    if (!modelId) return
    setBusy(true)
    try {
      const response = await adminFetch(`/admin/models/${encodeURIComponent(modelId)}/content`)
      const data = await response.json()
      setContent(data)
      setStatus('Контент модели загружен')
    } catch (error) {
      setStatus(`Ошибка загрузки контента: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }, [adminFetch, selectedModelId])

  useEffect(() => {
    if (!isActive) return
    loadModels().catch((error) => setStatus(`Ошибка списка моделей: ${error.message}`))
  }, [isActive, loadModels])

  useEffect(() => {
    if (!isActive || !selectedModelId) return
    loadContent(selectedModelId)
  }, [isActive, selectedModelId, loadContent])

  const mediaFlagsFor = (url) => content?.media_flags?.[url] || {}

  const setLocalMediaFlag = (url, flags) => {
    setContent((prev) => {
      if (!prev) return prev
      const nextFlags = { ...(prev.media_flags || {}) }
      if (flags.is_adult || flags.is_paid) {
        nextFlags[url] = flags
      } else {
        delete nextFlags[url]
      }
      return { ...prev, media_flags: nextFlags }
    })
  }

  const setLocalPostFlag = (postId, key, checked) => {
    setContent((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        posts: (prev.posts || []).map((post) =>
          post.id === postId ? { ...post, [key]: checked } : post
        ),
      }
    })
  }

  const removeLocalStoryMedia = (url) => {
    setContent((prev) => {
      if (!prev) return prev
      const nextFlags = { ...(prev.media_flags || {}) }
      delete nextFlags[url]
      return {
        ...prev,
        media_flags: nextFlags,
        sections: (prev.sections || []).map((section) => ({
          ...section,
          items: (section.items || []).filter((item) => item.url !== url),
        })),
      }
    })
  }

  const updateMediaFlag = async (url, key, checked) => {
    if (!content?.model_id) return
    const current = mediaFlagsFor(url)
    const nextFlags = { ...current, [key]: checked }
    setLocalMediaFlag(url, nextFlags)
    setStatus('Сохраняю флаг медиа…')
    try {
      await adminFetch(`/admin/models/${encodeURIComponent(content.model_id)}/media-flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_flags: { [url]: nextFlags } }),
      })
      setStatus('Флаг медиа сохранён')
    } catch (error) {
      setLocalMediaFlag(url, current)
      setStatus(`Флаг медиа: ${error.message}`)
    }
  }

  const deleteStoryMedia = async (item) => {
    if (!content?.model_id) return
    if (!window.confirm('Удалить эту сторис из модели?')) return
    const previousContent = content
    removeLocalStoryMedia(item.url)
    setStatus('Удаляю сторис…')
    try {
      await adminFetch(`/admin/models/${encodeURIComponent(content.model_id)}/stories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, kind: item.kind }),
      })
      setStatus('Сторис удалена')
    } catch (error) {
      setContent(previousContent)
      setStatus(`Удаление сторис: ${error.message}`)
    }
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

  return (
    <section className="contentModerationPage">
      <section className="card">
        <h2>Разметка контента модели</h2>
        <p className="fieldHint">
          Старый контент без галочек считается разрешённым. Эротика фильтруется backend-настройкой, платный контент пока только помечается.
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
          <button type="button" disabled={busy || !selectedModelId} onClick={() => loadContent()}>
            Обновить
          </button>
        </div>
        {status ? <p className="status">{status}</p> : null}
      </section>

      {content?.sections?.map((section) => (
        <section className="card" key={section.id}>
          <h3>{section.title}</h3>
          {section.items?.length ? (
            <div className="moderationGrid">
              {section.items.map((item) => {
                const flags = mediaFlagsFor(item.url)
                return (
                  <article className="moderationCard" key={`${section.id}-${item.group_id || ''}-${item.url}`}>
                    {item.kind === 'video' ? (
                      <video src={item.url} controls muted playsInline />
                    ) : (
                      <img src={item.url} alt={section.title} />
                    )}
                    {item.group_id ? <small className="fieldHint">group: {item.group_id}</small> : null}
                    {(section.id === 'story_images' || section.id === 'story_videos') && (
                      <button
                        type="button"
                        className="dangerButton"
                        onClick={() => deleteStoryMedia(item)}
                      >
                        Удалить сторис
                      </button>
                    )}
                    <label className="flagToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(flags.is_adult)}
                        onChange={(event) => updateMediaFlag(item.url, 'is_adult', event.target.checked)}
                      />
                      <span>Эротика</span>
                    </label>
                    <label className="flagToggle">
                      <input
                        type="checkbox"
                        checked={Boolean(flags.is_paid)}
                        onChange={(event) => updateMediaFlag(item.url, 'is_paid', event.target.checked)}
                      />
                      <span>Платный</span>
                    </label>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="fieldHint">Нет контента в этой секции.</p>
          )}
        </section>
      ))}

      {content && (
        <section className="card">
          <h3>Посты модели</h3>
          {content.posts?.length ? (
            <div className="moderationGrid">
              {content.posts.map((post) => (
                <article className="moderationCard" key={post.id}>
                  <img src={post.image_url} alt={post.id} />
                  <strong>{post.status_ru}</strong>
                  {post.caption_ru ? <p>{post.caption_ru}</p> : null}
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
                </article>
              ))}
            </div>
          ) : (
            <p className="fieldHint">Постов у модели пока нет.</p>
          )}
        </section>
      )}
    </section>
  )
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
  const [editingModelId, setEditingModelId] = useState(null)
  const [editorModels, setEditorModels] = useState([])
  const [editorSelectedId, setEditorSelectedId] = useState('')
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

  const withAdminHeaders = useCallback((headers = {}) => ({ ...headers, 'X-Admin-Login': adminLogin }), [adminLogin])
  const adminFetch = useCallback(async (path, options = {}) => {
    const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...options,
      headers: withAdminHeaders(options.headers || {}),
    })
    if (!response.ok) throw new Error(await response.text())
    return response
  }, [withAdminHeaders])

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

  const reloadEditorModels = async () => {
    try {
      const response = await adminFetch('/admin/models')
      const data = await response.json()
      setEditorModels(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      setStatus(`Список моделей: ${error.message}`)
    }
  }

  useEffect(() => {
    if (!isAuthed || mainTab !== 'editor') return
    reloadEditorModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, mainTab])

  const loadEditorModelIntoForm = async () => {
    const id = editorSelectedId.trim()
    if (!id) {
      setStatus('Выберите модель в списке')
      return
    }
    setIsLoading(true)
    setStatus('')
    try {
      const response = await adminFetch(`/admin/models/${encodeURIComponent(id)}`)
      const doc = await response.json()
      setForm(formFromRedisModel(doc))
      setEditingModelId(id)
      setStatus(`Загружена модель ${id}. Можно править поля и медиа ниже.`)
    } catch (error) {
      setStatus(`Ошибка загрузки модели: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const clearEditorSession = () => {
    setEditingModelId(null)
    setEditorSelectedId('')
    setForm({ ...defaultForm })
    setStatus('Форма редактора сброшена')
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
      if (mediaKind === 'profile_image') setField('profileImageUrls', [...form.profileImageUrls, ...urls])
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
    } else if (mediaKind === 'profile_image') {
      setField('profileImageUrls', form.profileImageUrls.filter((item) => item !== url))
    }
    setForm((prev) => {
      const mediaFlags = { ...(prev.mediaFlags || {}) }
      delete mediaFlags[url]
      return { ...prev, mediaFlags }
    })
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

  const addContentPhotoFiles = (files, sourceLabel = 'фото') => {
    const imageFiles = Array.from(files || []).filter(Boolean)
    if (!imageFiles.length) {
      setStatus(`Нет изображений для добавления`)
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
    setStatus(`Добавлено ${sourceLabel}: ${imageFiles.length}. Всего: ${next.length}`)
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
    addContentPhotoFiles(imageFiles, 'из буфера')
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
      const hasActive = groups.some((item) => CONTENT_ACTIVE_STATUSES.has(item.status))
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
    setStatus('Загружаю фото и запускаю фоновые задачи...')
    try {
      const sessionId = await ensureContentSession()
      const formData = new FormData()
      pastedContentFiles.forEach((file) => formData.append('files', file))
      const response = await adminFetch(`/admin/content/session/${sessionId}/generate-prompts`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      const groups = Array.isArray(data.prompt_groups) ? data.prompt_groups : []
      setContentPromptGroups(groups)
      setStatus(`Задачи запущены: ${groups.length}. Промты и Kling будут появляться ниже автоматически.`)
      pollContentSession(sessionId, 1000)
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

  useEffect(() => {
    if (!isAuthed || !contentSessionId) return
    pollContentSession(contentSessionId, 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, contentSessionId])

  const toggleGeneratedSelection = (promptId, url, target) => {
    const key = `${promptId}|||${url}`
    setContentSelection((prev) => {
      const current = prev[key] || { story: false, chat: false, profile: false, is_adult: false, is_paid: false }
      const nextItem = { ...current, [target]: !current[target] }
      return { ...prev, [key]: nextItem }
    })
  }

  const toggleGeneratedFlag = (promptId, url, flag) => {
    const key = `${promptId}|||${url}`
    setContentSelection((prev) => {
      const current = prev[key] || { story: false, chat: false, profile: false, is_adult: false, is_paid: false }
      return { ...prev, [key]: { ...current, [flag]: !current[flag] } }
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
        return {
          prompt_id: promptId,
          url,
          targets,
          is_adult: Boolean(flags.is_adult),
          is_paid: Boolean(flags.is_paid),
        }
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
      const mediaFlags = patch.media_flags || {}
      setForm((prev) => ({
        ...prev,
        storyImageUrls: dedupe([...(prev.storyImageUrls || []), ...(media.story_image_urls || [])]),
        chatImageUrls: dedupe([...(prev.chatImageUrls || []), ...(media.chat_image_urls || [])]),
        profileImageUrls: dedupe([...(prev.profileImageUrls || []), ...(media.profile_image_urls || [])]),
        mediaFlags: { ...(prev.mediaFlags || {}), ...mediaFlags },
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
    setStatus('Генерация EN/DE/FR/PT/ES...')
    try {
      const response = await adminFetch('/admin/generate-en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_ru: ruSourcePayloadFromForm(form) }),
      })
      const en = (await response.json()).fields_en || {}
      const asString = (value) => {
        if (Array.isArray(value)) return value.join(', ')
        if (value === null || value === undefined) return ''
        return String(value).trim()
      }
      const fieldValue = (camelBase, snakeBase, key, suffix, fallback) =>
        asString(en[`${camelBase}${suffix}`] ?? en[`${snakeBase}_${key}`] ?? fallback)
      setForm((prev) => ({
        ...prev,
        ...Object.fromEntries(
          MODEL_LOCALES.filter(({ key }) => key !== 'ru').flatMap(({ key, suffix }) => [
            [`name${suffix}`, fieldValue('name', 'name', key, suffix, prev[`name${suffix}`])],
            [`bioShort${suffix}`, fieldValue('bioShort', 'bio_short', key, suffix, prev[`bioShort${suffix}`])],
            [`bioFull${suffix}`, fieldValue('bioFull', 'bio_full', key, suffix, prev[`bioFull${suffix}`])],
            [
              `speakingStyle${suffix}`,
              fieldValue('speakingStyle', 'speaking_style', key, suffix, prev[`speakingStyle${suffix}`]),
            ],
            [`likes${suffix}`, fieldValue('likes', 'likes', key, suffix, prev[`likes${suffix}`])],
          ])
        ),
      }))
      setStatus('Языки EN/DE/FR/PT/ES обновлены')
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
      if (editingModelId) {
        const response = await adminFetch(`/admin/models/${encodeURIComponent(editingModelId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_data: previewModel }),
        })
        const data = await response.json()
        const mobileUrl = data?.model?.story_media?.avatar_video_mobile_url || ''
        if (mobileUrl) {
          setField('avatarVideoMobileUrl', mobileUrl)
          setStatus(`Модель ${editingModelId} сохранена. Mini avatar video создан.`)
        } else if (form.avatarVideoUrl) {
          setStatus(`Модель ${editingModelId} сохранена, но mini avatar video не создан — проверь backend ffmpeg/R2 logs.`)
        } else {
          setStatus(`Модель ${editingModelId} сохранена в Redis`)
        }
      } else {
        const response = await adminFetch('/admin/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_data: previewModel }),
        })
        const data = await response.json()
        const mobileUrl = data?.model?.story_media?.avatar_video_mobile_url || ''
        setStatus(mobileUrl ? 'Модель создана. Mini avatar video создан.' : 'Модель создана')
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
      }
      if (mainTab === 'editor') {
        reloadEditorModels()
      }
    } catch (error) {
      setStatus(editingModelId ? `Ошибка сохранения: ${error.message}` : `Ошибка создания: ${error.message}`)
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
            <button
              type="button"
              className={mainTab === 'editor' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('editor')}
            >
              Редактор моделей
            </button>
            <button
              type="button"
              className={mainTab === 'posts' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('posts')}
            >
              Лента постов
            </button>
            <button
              type="button"
              className={mainTab === 'content' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('content')}
            >
              Контент
            </button>
            <button
              type="button"
              className={mainTab === 'settings' ? 'topTab active' : 'topTab'}
              onClick={() => setMainTab('settings')}
            >
              Настройки
            </button>
          </nav>
        </div>
        <div className="headerActions">
          {(mainTab === 'generator' || mainTab === 'editor') && (
            <>
              <button type="button" onClick={() => setStep('form')}>Форма</button>
              <button type="button" onClick={() => setStep('preview')}>Preview</button>
              {mainTab === 'generator' && (
                <button type="button" onClick={resetAllDraftData}>Новая генерация</button>
              )}
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

      {mainTab === 'posts' && <FeedPostsTab adminFetch={adminFetch} isActive={mainTab === 'posts'} />}
      {mainTab === 'content' && <ContentModerationTab adminFetch={adminFetch} isActive={mainTab === 'content'} />}
      {mainTab === 'settings' && <ContentSettingsTab adminFetch={adminFetch} isActive={mainTab === 'settings'} />}

      {mainTab === 'editor' && step === 'form' && (
        <section className="card">
          <h2>Редактор существующей модели</h2>
          <p className="fieldHint">
            Выберите модель, нажмите «Загрузить в форму» — откроются те же поля, что в генераторе (описания, сторис-фото,
            видео и т.д.). Можно удалять пункты из списков URL кнопкой × и добавлять новые файлы — они уйдут в R2 как при
            создании.
          </p>
          <label htmlFor="editor-model-select">Модель</label>
          <select
            id="editor-model-select"
            value={editorSelectedId}
            onChange={(e) => setEditorSelectedId(e.target.value)}
          >
            <option value="">— Выберите модель —</option>
            {editorModels.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.name && String(m.name).trim()) || m.id} · {m.id}
                {!m.is_active ? ' (выкл.)' : ''}
              </option>
            ))}
          </select>
          <div className="miniRow" style={{ marginTop: 10 }}>
            <button type="button" disabled={isLoading || !editorSelectedId} onClick={loadEditorModelIntoForm}>
              Загрузить в форму
            </button>
            <button type="button" disabled={isLoading} onClick={reloadEditorModels}>
              Обновить список
            </button>
            <button type="button" onClick={clearEditorSession}>
              Сбросить форму
            </button>
          </div>
          {editingModelId ? (
            <p className="status" style={{ marginTop: 12 }}>
              Редактируется <code>{editingModelId}</code> — внизу вкладки заполните блоки «База», «Тексты», «Media». Сохранение: кнопка в Preview или добавьте через форму (перейдите в Preview).
            </p>
          ) : null}
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
            <label>Фото для промтов (1-{CONTENT_MAX_FILES} шт, jpg/png/webp, до 10MB)</label>
            <div className="pasteZone" onPaste={onPasteContentPhotos} tabIndex={0}>
              Нажми сюда и вставь фотографии через Ctrl+V или выбери файлы ниже
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                addContentPhotoFiles(event.target.files, 'из файлов')
                event.target.value = ''
              }}
            />
            <div className="miniRow">
              <span>Добавлено: {pastedContentFiles.length}</span>
              <button type="button" onClick={clearPastedPhotos}>Очистить</button>
            </div>
            <button disabled={isLoading || !prefillImageUrl} onClick={generateContentPrompts}>
              Запустить промты + Kling
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
                    {(group.description_ru || group.description_en || group.topics?.length || group.outfit?.length || group.location || group.mood?.length || group.shot_type) && (
                      <div className="fieldHint">
                        {group.description_ru && <div><strong>Описание RU:</strong> {group.description_ru}</div>}
                        {group.description_en && <div><strong>Description EN:</strong> {group.description_en}</div>}
                        {!!group.topics?.length && <div><strong>topics:</strong> {group.topics.join(', ')}</div>}
                        {!!group.outfit?.length && <div><strong>outfit:</strong> {group.outfit.join(', ')}</div>}
                        {group.location && <div><strong>location:</strong> {group.location}</div>}
                        {!!group.mood?.length && <div><strong>mood:</strong> {group.mood.join(', ')}</div>}
                        {group.shot_type && <div><strong>shot_type:</strong> {group.shot_type}</div>}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isLoading || CONTENT_ACTIVE_STATUSES.has(group.status) || !(group.prompt_ru || group.prompt)}
                      onClick={() => startKlingForPrompt(group.id)}
                    >
                      Сгенерировать контент
                    </button>
                    {!!group.kling_output_urls?.length && (
                      <div className="generatedGrid">
                        {group.kling_output_urls.map((url) => {
                          const key = `${group.id}|||${url}`
                          const checked = contentSelection[key] || {
                            story: false,
                            chat: false,
                            profile: false,
                            is_adult: false,
                            is_paid: false,
                          }
                          return (
                            <div key={url} className="generatedItem">
                              <img src={url} alt="generated" />
                              <label><input type="checkbox" checked={checked.story} onChange={() => toggleGeneratedSelection(group.id, url, 'story')} /> сторис</label>
                              <label><input type="checkbox" checked={checked.chat} onChange={() => toggleGeneratedSelection(group.id, url, 'chat')} /> фото для чата</label>
                              <label><input type="checkbox" checked={checked.profile} onChange={() => toggleGeneratedSelection(group.id, url, 'profile')} /> фото для профиля</label>
                              <label><input type="checkbox" checked={checked.is_adult} onChange={() => toggleGeneratedFlag(group.id, url, 'is_adult')} /> эротика</label>
                              <label><input type="checkbox" checked={checked.is_paid} onChange={() => toggleGeneratedFlag(group.id, url, 'is_paid')} /> платный</label>
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
        </>
      )}

      {(mainTab === 'generator' || mainTab === 'editor') && step === 'form' && (
          <section className="grid">
            <article className="card">
              <h2>База (обязательно)</h2>
              <label>Имя RU (`name_i18n.ru`) *</label>
              <input value={form.nameRu} onChange={(e) => setField('nameRu', e.target.value)} />
              <small className="fieldExample">Пример: Айви</small>
              <label>Имя EN (`name_i18n.en`)</label>
              <input value={form.nameEn} onChange={(e) => setField('nameEn', e.target.value)} />
              <small className="fieldExample">Пример: Ivy</small>
              {EXTRA_MODEL_LOCALES.map(({ key, suffix, label }) => (
                <div key={`name-${key}`} className="localeField">
                  <label>Имя {label} (`name_i18n.{key}`)</label>
                  <input value={form[`name${suffix}`]} onChange={(e) => setField(`name${suffix}`, e.target.value)} />
                </div>
              ))}
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
              <label>Порядок в каталоге (`sort_order`)</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField('sortOrder', Number(e.target.value) || 0)}
              />
              <label className="chip" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                />
                Модель активна (`is_active`) — участвует в списке <code>models:active</code>
              </label>
              <button disabled={isLoading} onClick={generateEnglish}>Сгенерировать EN/DE/FR/PT/ES из RU</button>
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
              {EXTRA_MODEL_LOCALES.map(({ key, suffix, label }) => (
                <div key={`bio-short-${key}`} className="localeField">
                  <label>Короткое описание {label} (`bio_short_i18n.{key}`)</label>
                  <textarea value={form[`bioShort${suffix}`]} onChange={(e) => setField(`bioShort${suffix}`, e.target.value)} />
                </div>
              ))}
              <label>Полное описание RU (`bio_full_i18n.ru`) *</label>
              <textarea value={form.bioFullRu} onChange={(e) => setField('bioFullRu', e.target.value)} />
              <small className="fieldExample">Пример: Любит музыку, прогулки и живой флирт без грубости.</small>
              <label>Полное описание EN (`bio_full_i18n.en`)</label>
              <textarea value={form.bioFullEn} onChange={(e) => setField('bioFullEn', e.target.value)} />
              <small className="fieldExample">Пример: Loves music, walks, and playful conversations.</small>
              {EXTRA_MODEL_LOCALES.map(({ key, suffix, label }) => (
                <div key={`bio-full-${key}`} className="localeField">
                  <label>Полное описание {label} (`bio_full_i18n.{key}`)</label>
                  <textarea value={form[`bioFull${suffix}`]} onChange={(e) => setField(`bioFull${suffix}`, e.target.value)} />
                </div>
              ))}
              <label>Стиль общения RU (`speaking_style_i18n.ru`) *</label>
              <textarea value={form.speakingStyleRu} onChange={(e) => setField('speakingStyleRu', e.target.value)} />
              <small className="fieldExample">Пример: Коротко, живо, с вопросами и редкими эмодзи.</small>
              <label>Стиль общения EN (`speaking_style_i18n.en`)</label>
              <textarea value={form.speakingStyleEn} onChange={(e) => setField('speakingStyleEn', e.target.value)} />
              <small className="fieldExample">Пример: Short, engaging, asks follow-up questions.</small>
              {EXTRA_MODEL_LOCALES.map(({ key, suffix, label }) => (
                <div key={`speaking-style-${key}`} className="localeField">
                  <label>Стиль общения {label} (`speaking_style_i18n.{key}`)</label>
                  <textarea value={form[`speakingStyle${suffix}`]} onChange={(e) => setField(`speakingStyle${suffix}`, e.target.value)} />
                </div>
              ))}
              <label>Что любит RU (`likes_i18n.ru`)</label>
              <input value={form.likesRu} onChange={(e) => setField('likesRu', e.target.value)} placeholder="музыка, кино, путешествия" />
              <small className="fieldHint">Список через запятую.</small>
              <label>Что любит EN (`likes_i18n.en`)</label>
              <input value={form.likesEn} onChange={(e) => setField('likesEn', e.target.value)} placeholder="music, movies, travel" />
              {EXTRA_MODEL_LOCALES.map(({ key, suffix, label }) => (
                <div key={`likes-${key}`} className="localeField">
                  <label>Что любит {label} (`likes_i18n.{key}`)</label>
                  <input value={form[`likes${suffix}`]} onChange={(e) => setField(`likes${suffix}`, e.target.value)} />
                </div>
              ))}
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
              <label>Mini видео-аватар (`story_media.avatar_video_mobile_url`)</label>
              <input
                value={form.avatarVideoMobileUrl}
                onChange={(e) => setField('avatarVideoMobileUrl', e.target.value)}
                placeholder="создаётся backend после сохранения модели"
              />
              {form.avatarVideoMobileUrl && <a href={form.avatarVideoMobileUrl} target="_blank" rel="noreferrer">mobile avatar video url</a>}
              <small className="fieldHint">
                Backend добавляет облегчённую версию при создании/сохранении модели, если задан `avatar_video_url`.
              </small>
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
              <input type="file" accept="image/*" multiple onChange={(e) => uploadManyMedia(Array.from(e.target.files || []), 'profile_image')} />
              {form.profileImageUrls.map((url) => (
                <div key={url} className="miniRow">
                  <a href={url} target="_blank" rel="noreferrer">{url.slice(0, 40)}...</a>
                  <button type="button" onClick={() => removeStoryMedia(url, 'profile_image')}>x</button>
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
      )}

      {(mainTab === 'generator' || mainTab === 'editor') && step === 'preview' && (
        <section className="previewGrid">
          <article className="card">
            <h2>Stories preview</h2>
            {form.avatarUrl ? <img className="avatarPreview" src={form.avatarUrl} alt="avatar" /> : <p>No avatar</p>}
            <p>{form.nameRu || 'Имя модели'}</p>
          </article>
          <article className="card">
            <h2>Payload</h2>
            <pre>{JSON.stringify(previewModel, null, 2)}</pre>
            <button disabled={isLoading} onClick={createModel}>
              {editingModelId ? 'Сохранить изменения' : 'Создать модель'}
            </button>
          </article>
        </section>
      )}

      {(mainTab === 'generator' || mainTab === 'editor') && status && <p className="status">{status}</p>}
    </main>
  )
}

export default App
