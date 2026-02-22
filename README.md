# generator_ai_model

Web admin frontend for creating AI model profiles used by `ai_chat_back`.

## Features

- Login gate using admin login (`Komar3000` by default on backend).
- Full model form with RU/EN fields and stable filter keys.
- Media upload to backend (`/admin/media/upload`) with R2 storage.
- Two-step flow: form -> preview -> confirm create.
- EN generation from RU fields via OpenAI (`/admin/generate-en`).

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
- `POST /admin/models`
