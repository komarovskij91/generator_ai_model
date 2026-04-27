# generator_ai_model

Web admin frontend for the Noloo stack. It is no longer only a model creator: it now covers model generation, push testing, and the feed-post preparation workflow used by the iOS app.

## Features

### Models

- admin login gate
- full model form with RU/EN fields and stable filter keys
- media upload to backend with R2 storage
- two-step flow: form -> preview -> confirm create
- EN generation from RU fields
- prefill by image/brief with gender-aware defaults

### Content session / prompt generation

- create content session from pasted images
- generate prompts per image
- start Kling generation per prompt
- apply selected generated media back into the final model payload

### Notifications

- dedicated admin tab for test push sending
- loads push candidates from backend
- can send test APNS to selected users
- supports optional model binding for communication-style push previews

### Feed posts

- upload and manage source photos
- generate feed drafts from source photos
- edit RU/EN/DE/FR/PT/ES captions
- set seeded likes/dislikes
- regenerate images or text for a draft
- save a draft as a prepared post
- publish a prepared post immediately
- delete drafts or posts
- view prepared and published post counts

## Run

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run lint
```

Optional frontend env:

```bash
VITE_BACKEND_BASE_URL=https://web-production-c51d.up.railway.app
```

## Backend Requirements

Backend (`ai_chat_back`) must expose:

### Models / generator

- `POST /admin/login`
- `POST /admin/media/upload`
- `DELETE /admin/media`
- `POST /admin/generate-en`
- `POST /admin/prefill-model`
- `POST /admin/content/session/create`
- `GET /admin/content/session/{id}`
- `POST /admin/content/session/{id}/generate-prompts`
- `POST /admin/content/session/{id}/kling/{prompt_id}/start`
- `POST /admin/content/session/{id}/apply`
- `POST /admin/models`

### Notifications

- `GET /admin/push/candidates`
- `POST /admin/push/send-test`
- public `GET /models/active` for model selection in notifications UI

### Feed posts

- `GET /admin/feed/source-photos`
- `POST /admin/feed/source-photos/upload`
- `DELETE /admin/feed/source-photos/{photo_id}`
- `POST /admin/feed/drafts/generate`
- `GET /admin/feed/drafts`
- `PATCH /admin/feed/drafts/{draft_id}`
- `POST /admin/feed/drafts/{draft_id}/regenerate-images`
- `POST /admin/feed/drafts/{draft_id}/regenerate-text`
- `POST /admin/feed/drafts/{draft_id}/save`
- `DELETE /admin/feed/drafts/{draft_id}`
- `GET /admin/feed/posts`
- `POST /admin/feed/posts/{post_id}/publish`
- `DELETE /admin/feed/posts/{post_id}`

## Current Feed Workflow

1. Upload source photos.
2. Backend generates draft prompts and 3 image candidates per draft.
3. Admin edits/selects image and localized captions; the long source prompt is kept in backend data but not shown in the draft card UI.
4. Draft is saved into the prepared queue.
5. Post can be published manually from admin or later by the worker.

Current baseline:

- generation is female-only
- captions are short, first-person, and localized for all app UI languages: RU/EN/DE/FR/PT/ES
- hashtags are not required
- prepared posts are the source for auto-publication

## Rich Push / Model Avatar In iOS Notifications

Current push behavior and payload requirements are documented in [docs/IOS_TELEGRAM_STYLE_PUSH.md](docs/IOS_TELEGRAM_STYLE_PUSH.md).

## Prompt Generation Notes

- Prompt generation is image-conditioned and runs per image to reduce cross-image mismatch.
- Backend prompt instructions require:
  - selfie vs non-selfie determination
  - explicit face emotion/mimic description
  - detailed clothing description
  - reference-preserving opening phrase for generated prompt text
