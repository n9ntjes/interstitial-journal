# Pivot plan — wiring `tauri-app` into the new auth system

The `web-app` and `api/` have moved behind authentication: every protected
endpoint now requires either a session cookie (web) **or** a `Bearer` device
token (desktop). Existing unauthenticated calls from `tauri-app` will start
returning **401** the moment this ships. This doc lays out what needs to
change on the desktop side to make it whole again.

Nothing in the Tauri code is broken yet — the backend just stopped accepting
anonymous writes. Treat this as a migration, not an emergency: do it in one
branch and cut over when the web-app ships.

---

## 1. Mental model

Before: the desktop app was an unauthenticated process that sent punches
into a single shared DB.

After: the desktop app is a **per-user signed-in client**. It gets its
identity from a long-lived **device token** that was baked into the ZIP
the user downloaded from the web-app. Every HTTP call to `api/*` MUST
carry that token as `Authorization: Bearer <hex>`.

Two things the Rust side must now own:

1. **Finding the token on first launch.** A sidecar file (`device.ij-config`)
   is shipped next to the installer. On first launch the app has to locate
   it, validate it, copy the useful parts into its own config dir (so future
   launches don't depend on the installer still being around), and delete
   the sidecar from its pickup location.
2. **Exposing the token to the webview.** The TS code that currently calls
   `fetch('/api/entries.php')` has no idea the concept of a token exists.
   The Rust side has to make the token reachable from JavaScript — either
   by injecting a header on every request via a plugin, or by exposing a
   `get_device_token` command the TS code reads once at boot.

Pick one — both work. The command-based approach is simpler and stays
inside Tauri's existing IPC surface, so that's the recommended path below.

---

## 2. The sidecar format

`download.php` writes a JSON file named `device.ij-config` into the ZIP
it streams to the user. Schema (version 1):

```jsonc
{
  "version":    1,
  "token":      "<64 hex chars>",
  "user_id":    12,
  "user_email": "alice@example.com",
  "platform":   "macos-arm64",
  "api_base":   "https://…/ij/api",
  "issued_at":  "2026-04-24T14:30:00Z"
}
```

Treat the whole thing as opaque except for `version`, `token`, `api_base`,
and `user_email` (for display). Tolerate unknown fields — future versions
of the server will add more. Bail out hard if `version` is anything other
than `1` for now and show a "please re-download the app" message.

The token is a bearer secret. Treat it like a password:

- never log it, never surface it in error messages, never print it to
  stdout in production builds,
- store it in the OS keychain if you can (macOS: Keychain via `security-framework`,
  Windows: Credential Manager, Linux: Secret Service). If that's too much
  work for v1, a 0600-permission file under `$APPCONFIG/ij/` is acceptable,
- never send it anywhere except to the origin in `api_base` as a Bearer
  header. Do not put it in query strings, do not embed it in logs, do not
  ship it via telemetry.

---

## 3. First-launch flow (Rust side)

Order of operations during setup:

1. Look for an already-paired config at `$APPCONFIG/ij/device.json`. If
   present, load `{ token, api_base, user_email }` into memory and stop —
   the app is already paired.
2. Otherwise, search for `device.ij-config` in, in order:
   - the directory containing the current executable (works on Linux
     AppImage / portable Windows EXE where the user kept the sidecar next
     to the binary),
   - `~/Downloads/` (most common on macOS, where users run the installer
     out of Downloads),
   - a small list of other "obvious" places (the current working dir,
     `$APPCONFIG` itself) — keep this short to avoid accidentally picking
     up a stale sidecar from an old account.
3. Parse it, validate `version == 1`, validate the token shape
   (`^[a-f0-9]{64}$`), and validate `api_base` is a reasonable URL.
4. Write `{ token, api_base, user_email, paired_at }` to
   `$APPCONFIG/ij/device.json` (or the keychain).
5. Delete the pickup sidecar so it doesn't hang around on the user's disk.
6. If nothing was found, enter "unpaired" UX state — don't crash. Show a
   small tray badge and an instruction to log in on the web-app and
   re-download.

Do this in `lib.rs`'s `setup` closure, before any window that might try
to call the API is shown. Keep the parsed token in app state
(`app.manage(DeviceAuth { … })`) so other subsystems can reach it without
touching the disk again.

Edge cases that matter:

- **User re-downloads.** They'll get a brand new sidecar with a fresh
  token. The desktop app should either re-pair automatically (replacing
  the stored token) or refuse and make them explicitly "switch account."
  Pick one and stick with it — both are defensible. The old token keeps
  working server-side until revoked; that's by design.
- **Token revoked server-side.** Every authed call can now return 401.
  On 401, wipe the stored token, drop to unpaired, and surface a
  "Your desktop app was signed out" notification.
- **Corrupt sidecar.** Missing fields, wrong version, unparseable JSON —
  treat as "no sidecar found" and fall through to unpaired UX. Don't
  delete a file you couldn't read.

---

## 4. Exposing the token to the frontend

Add a small Tauri command that returns the token (or `null` if unpaired):

```rust
#[tauri::command]
fn get_device_auth(state: tauri::State<DeviceAuth>) -> Option<DeviceAuthDto> { … }
```

`DeviceAuthDto` should carry `{ token, api_base, user_email }`. The TS
side calls it once at app boot, caches the result, and passes the token
as a header on every API call.

Don't expose the token via a window-scoped global or inject it into
`window.__IJ_TOKEN__`. Use the command — it goes over Tauri's typed IPC,
it's scoped to the specific capability you allow, and it stops leaking
if the webview's JS is ever compromised.

Add the command to the capabilities file so the webview can actually
invoke it.

---

## 5. Frontend changes (TS side)

Today the frontend has two files hitting the API directly with `fetch`:

- `tauri-app/src/App.tsx` (quick-punch submit, image upload)
- `tauri-app/src/LiveFeed.tsx` (entry polling)

Both need to go through a single wrapper that knows about the token.
Mirror the web-app's shape — a small `api/client.ts` that:

1. Calls `get_device_auth` once on first use and caches the result.
2. On every request, sets `Authorization: Bearer <token>`.
3. On every request, uses `api_base` from the sidecar (not the
   `VITE_API_BASE` env var — that was for dev, and production builds
   talk to the user's real server).
4. On 401, invalidates the cache and surfaces a "please re-pair"
   state to the UI.

The wrapper should expose the same couple of helpers the app already
uses (`createEntry`, `uploadImage`, `listRecentEntries`) and nothing
else — keep the surface tight.

A few things to consciously change:

- **LiveFeed's `<img>` tags.** Browser-issued `<img>` requests won't
  carry the `Authorization` header, so images from `/api/images_show.php`
  will 401. Options: (a) fetch the image bytes via authenticated
  `fetch`, turn into an object URL, use that in `<img src>`; (b) ask
  the server for short-lived, token-less image URLs; (c) accept that
  the live feed doesn't show images in v1. Option (c) is the pragmatic
  call — Live Feed is a text ticker.
- **Dev mode.** `VITE_API_BASE` defaults to `/api`. In paired production
  builds, use `api_base` from the sidecar instead. Keep the env var as
  a dev escape hatch.
- **The unpaired state.** Quick-punch shouldn't silently swallow
  submissions when there's no token. Disable the input and show a
  short "Open the web-app and re-download to sign in" message in the
  error strip you already have.

---

## 6. Config file format on disk

Keep it boring — JSON, single file, one version field:

```jsonc
// $APPCONFIG/ij/device.json
{
  "version":    1,
  "token":      "…",
  "api_base":   "…",
  "user_email": "…",
  "paired_at":  "2026-04-24T14:31:02Z"
}
```

This is deliberately **not** the same shape as the sidecar — the sidecar
carries fields we only need at pairing time (`platform`, `issued_at`).
Keeping them separate stops future server-side changes to the sidecar
format from forcing a local-format migration.

If/when you move to the OS keychain, keep only `token` there and leave
`api_base`/`user_email` in the JSON file. Non-secret data doesn't need
to live in the keychain and it's annoying to debug.

---

## 7. What does NOT change

A deliberate non-goal list so nobody over-scopes this:

- **The hotkey/overlay/tray architecture.** All of that is client-local
  and doesn't care about auth.
- **The database/API wire format.** Entries, tags, images — same JSON
  envelope, same endpoints, same fields. Auth is a header, not a schema
  change.
- **Live Feed's visual design.** Just its data source has to pass through
  the authenticated fetch wrapper.
- **Theme persistence.** Prefs still live in `desktop_prefs.json`; they
  have nothing to do with auth.

---

## 8. Rollout order

The way to sequence this without breaking anyone:

1. Ship the API changes and the web-app's login/signup/download flow
   first (already done on this branch).
2. Do the Tauri changes on a separate branch. While it's in flight, the
   desktop app will be broken against the new API — that's fine, staff
   using the desktop app should run it against a staging API or hold
   off updating until the Tauri PR lands.
3. Cut a fresh installer with the Tauri changes. Drop it under
   `api/data/installers/<platform>/`. The web-app's Download page now
   mints a sidecar around it automatically.
4. Ask existing users (there's a handful of internal ones) to download
   a fresh bundle. Their old unauthenticated client just starts 401-ing
   and the empty state tells them what to do.

No data migration is needed on the client side — the Tauri app has never
held user data locally, it was always a thin shell over the API.

---

## 9. Checklist for the implementing engineer

Small enough to fit on one screen:

- [ ] Add sidecar discovery + parse + persist in Rust `setup`.
- [ ] Store token securely (keychain preferred, 0600 file acceptable).
- [ ] Add `get_device_auth` Tauri command; wire capability.
- [ ] Write `api/client.ts` wrapper that injects Bearer header and uses
      `api_base` from the paired config.
- [ ] Migrate `App.tsx` submit + `LiveFeed.tsx` poll to the wrapper.
- [ ] Handle 401 → wipe token → unpaired UX.
- [ ] Handle unpaired state visually (disabled pill, short message).
- [ ] Manual test: fresh install → download bundle → open app →
      submit a punch → confirm it appears in the web-app under the
      same account.
- [ ] Manual test: revoke the device token from the web-app's settings
      and confirm the desktop app drops to unpaired within one request
      cycle.
