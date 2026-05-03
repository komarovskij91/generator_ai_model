# generator_ai_model

Web admin frontend for the Noloo stack. It is the operational console for model creation, model content, moderation flags, post generation, push testing, and feed management.

## Repository

- Local path: `/Users/komarovskij/ai_chat/generator_ai_model`
- Git: `https://github.com/komarovskij91/generator_ai_model.git`
- Backend dependency: `https://web-production-c51d.up.railway.app`

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

## High-Level Responsibilities

The admin app covers:

- admin login;
- model creation/editing;
- RU/EN copy generation;
- image/brief-based model prefill;
- content sessions;
- Kling generation;
- applying selected media into a model payload;
- media flagging;
- source photo uploads;
- feed draft generation;
- prepared/published post management;
- push notification testing.

It is no longer only a model creator.

## Model Creation

The model flow includes:

- RU/EN model name and copy fields;
- gender and age group fields;
- stable filter keys:
  - `gender`
  - `target_age_group`
  - `archetype_keys`
  - `ethnicity_key`
  - `interest_keys`
  - `discover_filters`
- avatar/story/chat/profile media;
- generated media groups;
- moderation flags;
- preview before final create/update.

Backend endpoints:

- `POST /admin/login`
- `POST /admin/media/upload`
- `DELETE /admin/media`
- `POST /admin/generate-en`
- `POST /admin/prefill-model`
- `POST /admin/models`
- `GET /admin/models`
- `GET /admin/models/{model_id}`
- `PATCH /admin/models/{model_id}`

When a model has `story_media.avatar_video_url`, backend can generate `story_media.avatar_video_mobile_url`. The iOS app prefers the mobile URL.

## Model Content And Moderation

Admin content tools cover:

- model story photos;
- story videos;
- chat photos;
- chat videos;
- profile/gallery photos;
- generated media groups;
- related posts.

Supported flags:

- adult/erotic;
- paid;
- prime-only for posts.

Backend endpoints:

- `GET /admin/models/{model_id}/content`
- `PATCH /admin/models/{model_id}/media-flags`
- `DELETE /admin/models/{model_id}/stories`
- `GET /admin/content-settings`
- `PATCH /admin/content-settings`

Rules:

- flag changes should feel immediate in UI;
- backend remains source of truth;
- legacy media without flags is allowed by default;
- App Review/safety mode is controlled by backend `hide_adult_content`.

## Content Sessions / Prompt Generation

Content session flow:

1. Create session from pasted images or selected local files.
2. Generate prompts per source image.
3. Start Kling generation per prompt.
4. Review generated outputs.
5. Select media targets:
   - story;
   - chat;
   - profile.
6. Set media flags before applying.
7. Apply selected media into final model payload.

Backend endpoints:

- `POST /admin/content/session/create`
- `GET /admin/content/session/{id}`
- `POST /admin/content/session/{id}/generate-prompts`
- `POST /admin/content/session/{id}/kling/{prompt_id}/start`
- `POST /admin/content/session/{id}/apply`

Prompt generation rules:

- prompts are image-conditioned;
- generation runs per image;
- prompts should preserve reference identity;
- prompt text should include face emotion, clothing details, pose, scene, and style;
- no silent downgrade to generic prompts.

## Feed Posts

The feed tab manages the iOS Posts surface.

Workflow:

1. Upload source photos.
2. Generate feed drafts.
3. Review image candidates.
4. Edit localized captions.
5. Set seeded likes/dislikes.
6. Mark adult/paid/prime-only flags if needed.
7. Save draft as prepared post.
8. Publish manually or leave for worker auto-publication.

Backend endpoints:

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

Performance baseline:

- source photos, drafts, prepared posts, and published posts are paginated;
- infinite scroll loads more items;
- images use `loading="lazy"` and `decoding="async"`;
- do not reintroduce full interval refresh;
- backend uses batch Redis loading where possible.

Caption baseline:

- first-person model voice;
- short social style;
- localized for app languages where available;
- no hashtags by default.

## Push Testing

Admin can test push notifications against registered users/devices.

Backend endpoints:

- `GET /admin/push/candidates`
- `POST /admin/push/send-test`

Payload should support:

- `chat_model_id`;
- `chat_model_name`;
- `chat_model_avatar_url`;
- `aps.mutable-content = 1`.

Detailed iOS rich push notes live in `docs/IOS_TELEGRAM_STYLE_PUSH.md`.

## Backend Requirements

The admin app expects backend to provide:

- admin auth;
- media upload/delete;
- model prefill/generation;
- model create/update/list/detail;
- content sessions;
- Kling jobs;
- feed source/draft/post APIs;
- push candidates/test send;
- content settings and media flags.

Production backend:

- `https://web-production-c51d.up.railway.app`

## External Services

Admin/backend workflows depend on:

- Railway backend;
- Redis;
- Cloudflare R2/CDN;
- xAI/Grok or OpenAI-compatible LLM APIs;
- Kling generation APIs;
- APNS for push tests;
- ffmpeg on backend for mobile avatar video generation.

## Operational Notes

- Do not paste or store secrets in frontend code.
- Admin login is simple and header-based; treat it as an internal tool.
- When backend schema changes, update admin payload mapping at the same time.
- When adding flags or media fields, preserve legacy content behavior.
- When App Review mode is needed, use backend content settings rather than client-only hiding.

## Verification Checklist

After admin changes verify:

- admin login;
- model list/detail;
- create/update model;
- content flags;
- source photo upload;
- feed draft pagination;
- prepared/published post pagination;
- push candidate loading;
- production backend base URL selection.
