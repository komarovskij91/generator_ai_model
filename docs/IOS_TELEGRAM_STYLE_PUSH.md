# iOS Rich Push Notifications With Model Avatar

Current push implementation uses an iOS Notification Service Extension to create communication-style notifications for model chat messages.

## Local Files

iOS app:

- `/Users/komarovskij/ai_chat/ai_chat/NotificationService`
- `/Users/komarovskij/ai_chat/ai_chat/ai_chat/ai_chatApp.swift`
- `/Users/komarovskij/ai_chat/ai_chat/ai_chat/ContentView.swift`

Backend/admin/worker:

- `/Users/komarovskij/ai_chat/ai_chat_back/main.py`
- `/Users/komarovskij/ai_chat/generator_ai_model/src/App.jsx`
- `/Users/komarovskij/ai_chat/noloo_notification/main.py`

## Current Implementation

The extension:

- reads custom keys from `userInfo`;
- downloads `chat_model_avatar_url` when present;
- creates `INSendMessageIntent`;
- creates `INPerson` for the model sender;
- calls `UNNotificationContent.updating(from:)`;
- falls back to `UNNotificationAttachment` if intent-based update fails.

Result:

- supported iOS versions can show a model sender name and avatar in a communication-style notification;
- if communication update fails, notification still arrives in a simpler format.

## Required Payload

`aps` must include:

```json
{
  "mutable-content": 1
}
```

Root custom keys:

- `chat_model_id` — required for deep link and conversation identity.
- `chat_model_avatar_url` — optional public HTTPS avatar URL.
- `chat_model_name` — optional sender display name; fallback can use notification title.

Recommended payload shape:

```json
{
  "aps": {
    "alert": {
      "title": "Model Name",
      "body": "Message preview"
    },
    "mutable-content": 1,
    "sound": "default"
  },
  "chat_model_id": "model_id_here",
  "chat_model_name": "Model Name",
  "chat_model_avatar_url": "https://..."
}
```

Without `mutable-content`, the Notification Service Extension will not run.

## Backend Responsibilities

Backend push send logic should:

- include `aps.mutable-content = 1`;
- include `chat_model_id`;
- include a stable model name;
- include a lightweight avatar image URL where available;
- avoid sending huge images or unstable redirect URLs.

Admin test push should use the same payload shape as production push.

## iOS App Responsibilities

Expected flow:

1. APNS notification arrives.
2. Notification Service tries to enrich the notification.
3. User taps notification.
4. App receives `chat_model_id`.
5. App resolves model from available models, chat list, or profile endpoint.
6. App opens chat and starts/loads session.

## Fallback Behavior

Fallback is required because iOS communication notification APIs can fail depending on OS state, timing, avatar fetch, or intent update behavior.

Fallback path:

- download avatar image;
- store temporary file;
- attach with `UNNotificationAttachment`;
- deliver modified content.

If avatar download fails, deliver text notification.

## Limitations

- iOS controls the sender avatar mask.
- Public API does not allow forcing rounded-square sender image in communication-style notifications.
- Notification Service has limited execution time.
- Avatar URL must be public HTTPS.
- Large images or slow CDN responses can cause text-only fallback.

## Admin Testing

The `generator_ai_model` push tab should allow testing:

- a candidate user/device;
- a selected model;
- title/body;
- optional model binding;
- communication-style payload.

Backend endpoints:

- `GET /admin/push/candidates`
- `POST /admin/push/send-test`

## App Review Notes

If showing push functionality in App Review materials:

- demonstrate permission prompt only if it appears naturally;
- explain that push is used for chat/message updates from AI characters;
- do not rely on push as the only way to demonstrate core app function.

## References

- [Modifying content in newly delivered notifications](https://developer.apple.com/documentation/usernotifications/modifying-content_in_newly_delivered_notifications)
- Apple `INSendMessageIntent`
- Apple Communication Notifications documentation

