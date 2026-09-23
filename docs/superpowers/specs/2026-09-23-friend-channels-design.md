# Friend channels (deep links) — design

Date: 2026-09-23

## Goal

Let the user store one or more ways to reach each friend (WhatsApp, Instagram, Messenger,
Telegram, Signal, iMessage, SMS, phone, email, other) and open the conversation from Nudge
with one tap. Opening a channel records contact with the friend: it sets `lastContactAt`
to now and replans the nudge, exactly as nudge confirmation does.

Links never expire: they are derived from a stable identifier (phone number or username)
rather than stored as opaque URLs.

## Out of scope

- Reading, importing or summarizing conversations. No platform (WhatsApp, Instagram,
  Messenger, iMessage, Signal) offers an official API to read a user's personal chats;
  Telegram (TDLib) and Gmail do, and WhatsApp/Instagram/Messenger offer manual exports.
  These are future projects; see [Future outlook](#future-outlook).
- Undo of an accidental "open" (needs contact history; deferred with it).
- Share-sheet / share-extension intake ("Share profile → Nudge").
- Group chats.
- Detecting whether a phone number is registered on WhatsApp/Signal (no API exists).

## Decisions

| Topic               | Decision                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Stored identity     | `handle` (E.164 phone, username, numeric id or email) + `type`. Link is derived; `deep_link` is only for `OTHER`.         |
| Link building       | Server-side `channelLink(channel)`; responses carry a computed `link`. Clients never build URLs.                          |
| Link style          | `https://` universal links where the platform has one (open the app, fall back to web; no `LSApplicationQueriesSchemes`). |
| New types           | Add `INSTAGRAM` and `MESSENGER` to `channels_type_enum`.                                                                  |
| Contact recording   | New `POST …/channels/:channelId/open`; no revision; shares `recordContact` with nudge confirm.                            |
| Order on tap        | `Linking.openURL` first; record contact only after it resolves. A failed open records nothing.                            |
| Input               | Platform-first modal; paste/clipboard parsing to a resolved preview the user confirms; system contact picker for phones.  |
| Phone normalization | Client-side `libphonenumber-js`, device region as default country; server accepts E.164 only.                             |
| Undo                | None in v1; success toast only.                                                                                           |

## Data model

Migration `ChannelHandle` (no backfill needed — nothing writes channels yet):

- `ALTER TYPE channels_type_enum ADD VALUE 'INSTAGRAM'`, `… 'MESSENGER'`.
- `ADD COLUMN handle text NOT NULL`.
- `ALTER COLUMN deep_link DROP NOT NULL`.
- Unique index `channels_friend_id_type_handle_key` on `(friend_id, type, handle)`.

Entity `Channel` gains `handle: string`; `deepLink` becomes `string | null` and its doc
comment changes to "Only for OTHER: the user-supplied URL".

### Handle rules and derived links

| Type      | Handle                                      | `link`                               |
| --------- | ------------------------------------------- | ------------------------------------ |
| WHATSAPP  | E.164 phone (`+420777123456`)               | `https://wa.me/420777123456`         |
| SIGNAL    | E.164 phone                                 | `https://signal.me/#p/+420777123456` |
| SMS       | E.164 phone                                 | `sms:+420777123456`                  |
| PHONE     | E.164 phone                                 | `tel:+420777123456`                  |
| IMESSAGE  | E.164 phone or email                        | `sms:<handle>`                       |
| TELEGRAM  | Username `^[A-Za-z0-9_]{5,32}$`             | `https://t.me/<handle>`              |
| INSTAGRAM | Username `^[A-Za-z0-9._]{1,30}$`            | `https://ig.me/m/<handle>`           |
| MESSENGER | Username `^[A-Za-z0-9.]{5,50}$` or digits   | `https://m.me/<handle>`              |
| EMAIL     | Email                                       | `mailto:<handle>`                    |
| OTHER     | Free-text label, ≤ 100 chars (e.g. Discord) | `deep_link`                          |

E.164 is `^\+[1-9]\d{6,14}$`. Usernames are stored without a leading `@`. For `OTHER`,
`deepLink` is required and must use `https:` or one of `tel:`, `sms:`, `mailto:`; it is
rejected for every other type.

## API

| Method | Route                                            | Behaviour                                                      |
| ------ | ------------------------------------------------ | -------------------------------------------------------------- |
| POST   | `/v1/friends/:friendId/channels`                 | `{ type, handle, deepLink? }` → 201 channel                    |
| PATCH  | `/v1/friends/:friendId/channels/:channelId`      | Nonempty subset of `{ handle, deepLink }` → 200 channel        |
| DELETE | `/v1/friends/:friendId/channels/:channelId`      | 204                                                            |
| POST   | `/v1/friends/:friendId/channels/:channelId/open` | Record contact now and replan → 200 `{ lastContactAt, nudge }` |

Channel response: `{ id, type, handle, deepLink, link }`. `GET /v1/friends` and
`GET /v1/friends/:friendId` already load channels; they gain `link` per channel.
`type` is immutable — delete and re-add to change platform.

Errors follow existing conventions: unknown fields, invalid handle for the type, or
`deepLink` on a non-OTHER type → 400; duplicate `(friend, type, handle)` → 409; missing or
other-user friend/channel, or a channel not belonging to the friend in the URL → 404.

### Recording contact

Extract the confirm branch of `NudgesService.change` into
`recordContact(manager, friend): Promise<Nudge>` (sets `friend.lastContactAt = new Date()`,
saves, returns `scheduling.plan(manager, friend)`). `confirm` and `open` both call it.

`open` runs in one transaction: `ownedFriend(manager, userId, friendId, true)` (friend lock
first, keeping the documented lock order), load the channel by `{ id, friendId }` or 404,
then `recordContact`. No revision is taken: opening a chat is a fact about now, not an action
on a specific reminder occurrence, so a stale client must not be able to drop it. It works
for friends with no nudge row (`plan` creates one) and with `nudgeEnabled: false`.

## Client

### Channel list and tap

The friend profile gets a "Contact via" section: one row per channel (platform icon,
platform name, handle) and a "+ Add" button. Long-press or an edit affordance opens the
channel modal in edit mode.

Tap flow (`useOpenChannel`):

1. `await Linking.openURL(channel.link)`. On failure: toast "Couldn't open <Platform>";
   nothing is recorded.
2. On success, fire `POST …/open` (no await before the app leaves the foreground).
3. On response, update the friend and friends-list query caches with the returned
   `lastContactAt` and `nudge`; toast "Marked <name> as contacted".
4. On request failure, show on return "Couldn't mark as contacted · Retry".

### Add / edit modal

`ChannelModal`, following `NoteModal` (`Modal`, `presentationStyle="pageSheet"`, editor
mounted per opening).

- **Step 1 — platform.** Grid of platform tiles. If the clipboard parses to a channel, a
  banner above the grid ("📋 Instagram @jan.novak · Use") skips to step 3.
- **Step 2 — details**, per platform:
  - Phone types: phone input (normalized to E.164 by `libphonenumber-js` with the device
    region as default), "Paste", and "Pick from contacts" (`expo-contacts` system picker;
    a contact with several numbers/emails shows a chooser).
  - Social types: username input, "Paste", a one-line how-to ("Instagram: profile → ⋯ →
    Copy profile URL") and an "Open <Platform>" button.
  - Email: email input. Other: label + URL.
- **Step 3 — confirm.** Resolved preview ("Instagram · @jan.novak"), "Test" (opens the
  link without recording contact) and "Save". Unparseable input shows an inline error.

Edit mode opens at step 2 with the type fixed, and adds "Delete".

App switching: modal state survives backgrounding. On `AppState` → `active` while the
modal is open, the clipboard is re-read and a parsed result offered, so copying a profile
URL in Instagram and returning pre-fills it. If the OS kills the app in the background
the draft is lost; that is accepted.

### Parsing

Pure function `src/lib/channel-input.ts`:
`parseChannelInput(text, hint?: ChannelType): { type, handle } | null`. Recognizes
`instagram.com/<u>` (query stripped), `ig.me/m/<u>`, `facebook.com/<u>`,
`facebook.com/profile.php?id=<n>`, `m.me/<u>`, `t.me/<u>`, `wa.me/<digits>`,
`signal.me/#p/<e164>`, phone numbers, emails and `@username`. `hint` resolves bare
usernames and phone numbers to the platform chosen in step 1. Server validation remains
authoritative.

### Dependencies

`expo-contacts`, `expo-clipboard`, `libphonenumber-js`. Requires a new dev build (EAS) and
the contacts usage description in `app.json`.

## Testing

- Server e2e: channel CRUD, per-type handle validation, `deepLink` rules, duplicate 409,
  ownership 404s (other user's friend, channel of another friend), `open` sets
  `lastContactAt`, replans and increments revision, `open` on a friend with no nudge
  creates one. Existing confirm tests keep passing after the `recordContact` extraction.
- Server unit: `channelLink` for every type.
- Client unit: `parseChannelInput` for each URL form, with and without `hint`.
- Client RNTL (`await render()`): modal steps, clipboard banner, confirm preview, edit/delete;
  tap-to-open with `Linking` mocked — records on success, not on failure.
- Bruno requests for the four routes; `docs/backend-api.md` updated.

## Future outlook

What each platform can offer beyond opening a chat:

| Platform            | Read personal conversations?                                       |
| ------------------- | ------------------------------------------------------------------ |
| WhatsApp            | No API. Manual "Export chat" (.txt/.zip) could be imported.        |
| Instagram/Messenger | No API for personal accounts. "Download your information" export.  |
| iMessage / Signal   | No.                                                                |
| SMS                 | Android only, restricted to default SMS apps by Play policy.       |
| Telegram            | Yes, via TDLib with the user's own login (server holds a session). |
| Email (Gmail)       | Yes, via OAuth; restricted scope requires a security assessment.   |

Unofficial clients (whatsapp-web.js, Baileys, Instagram scrapers) violate platform terms
and are excluded. The `open` events are a natural seed for a future contact-history table,
which would also enable Undo and summaries built from catch-up notes.
