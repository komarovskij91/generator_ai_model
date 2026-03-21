# generator_ai_model

Web admin frontend for creating AI model profiles used by `ai_chat_back`.

## Features

- Login gate using admin login (`Komar3000` by default on backend).
- Full model form with RU/EN fields and stable filter keys.
- Media upload to backend (`/admin/media/upload`) with R2 storage.
- Two-step flow: form -> preview -> confirm create.
- EN generation from RU fields (`/admin/generate-en`).
- Prefill by image/brief (`/admin/prefill-model`) with gender-aware defaults.
- Content session flow for prompt generation and media apply:
  - create session -> generate prompts by pasted images
  - start Kling per prompt
  - apply selected generated media into final payload

## Run

```bash
npm install
npm run dev
```

Optional frontend env:

```bash
VITE_BACKEND_BASE_URL=https://web-production-c51d.up.railway.app
```

## Backend requirements

Backend (`ai_chat_back`) must expose:

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
- `GET /admin/push/candidates` — пользователи с зарегистрированными push-устройствами (для админки «Уведомления»)
- `POST /admin/push/send-test` — тестовый APNS выбранным `user_ids` (`title`, `body`, опционально `model_id`)

## Prompt generation notes

- Prompt generation is image-conditioned and runs per image to reduce cross-image mismatch.
- Backend prompt instructions require:
  - selfie vs non-selfie determination
  - explicit face emotion/mimic description
  - detailed clothing description
  - reference-preserving opening phrase for generated prompt text
