# Уведомления «как в Telegram» на iOS (аватар отправителя)

Обычный remote push с полями `title` / `body` **не умеет** подставить отдельную «фотку контакта» сбаннера: слева всегда **иконка приложения**. Чтобы получить **аватар модели** (или стиль мессенджера), нужен один из двух путей ниже.

---

## Вариант A — **Notification Service Extension** (NSE) + картинка по URL

Подходит, если вы хотите **превью изображения** в развёрнутом уведомлении (и подготовку к ручному оформлению контента).

### Что сделать в Xcode

1. **File → New → Target → Notification Service Extension**  
   Добавить к основному таргету приложения (тот же Team / bundle id prefix).

2. В **основном** таргете включить capability **Push Notifications** (у вас уже есть).

3. В **NotificationService** (сгенерированный класс):
   - В `didReceive(_:withContentHandler:)` прочитать **custom-ключи** из `request.content.userInfo` (не из `aps`).
   - Если есть URL аватара (например `chat_model_avatar_url`), **скачать** файл (HTTPS, разумный размер; лимиты Apple ~ несколько МБ для вложения).
   - Сохранить во **временный файл** на диске и создать `UNNotificationAttachment` (обычно `identifier: "avatar"`, `options: nil` или с thumbnail clipping).
   - Вызвать `contentHandler` с изменённым `content` (с вложением).

4. В payload APNS в блок **`aps`** добавить:
   ```json
   "mutable-content": 1
   ```
   Иначе NSE **не запустится**.

### Что должен слать бэкенд

- В **корне** JSON (рядом с `aps`, не внутри `aps`):
  - `chat_model_id` — id чата / модели (у вас уже уходит при тестовом пуше).
  - `chat_model_avatar_url` — публичный **HTTPS** URL картинки (например аватар из R2); бэкенд уже может добавлять это поле, когда выбрана модель.

Без `mutable-content: 1` iOS не даст расширению изменить контент. Пока расширения нет, пуши без `mutable-content` ведут себя как сейчас.

### Ограничения

- Время жизни NSE **ограничено** (~30 секунд) — медленный CDN может привести к отсутствию картинки.
- URL должен быть доступен **с устройства** (без приватных IP, желательно без редирект-цепочек в ад).
- Формат файла: то, что понимает `UNNotificationAttachment` (часто jpeg/png).

---

## Вариант B — **Communication Notifications** (стиль «Сообщения»)

Даёт системный UI, похожий на **входящее сообщение от контакта** (имя + аватар в фирменном стиле iOS), но:

- Нужны **отдельные capability / настройки** (Communication Notifications), интеграция с **Intents** (`INSendMessageIntent` и связка с push).
- Сложнее в сопровождении, чем NSE; имеет смысл, если цель именно **нативный мессенджерный** вид, а не просто картинка.

Документация Apple: ищите по запросам *Communication Notifications*, *INSendMessageIntent*, *Push Notification*.

---

## Что выбрать

| Цель | Рекомендация |
|------|----------------|
| Быстро показать **фото/превью** в уведомлении | **NSE** + `mutable-content` + URL в payload |
| Максимально **как системный мессенджер** | **Communication Notifications** |

Текущее приложение без NSE/Communication показывает только **иконку приложения** и текст — это нормальное поведение iOS.

---

## Ссылка на официальные материалы

- [Modifying content in newly delivered notifications](https://developer.apple.com/documentation/usernotifications/modifying-content_in_newly_delivered_notifications) (Notification Service Extension)
- Human Interface Guidelines — раздел про уведомления и вложения

После появления NSE на стороне бэкенда для «боевых» пушей нужно будет добавить **`mutable-content": 1`** в `aps` там, где нужна картинка (тестовый и прод-пайплайн).
