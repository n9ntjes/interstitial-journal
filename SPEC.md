# Interstitial Journal — Full Specification (v2, monorepo)

> A micro-journaling system built around a global hotkey, a translucent quick-punch pop-up, a **single draggable live-feed overlay** (six latest entries, always-on-top; one window the user can drag onto any display), and a browser-hosted control surface with heatmaps, stats, and tag-based filtering. Split into three cooperating services: a PHP page-based API (canonical store), a React+TS web-app (the controller, served over the web), and a **native desktop application** built with Tauri (React+TS frontend inside a Rust host) that acts as the **system client** — installed locally on the user's machine, resident in the tray, talking directly to the OS for hotkeys, overlays, and screen capture.

---

## 1. Purpose & Philosophy

Interstitial Journal exists for the moments *between* tasks. Instead of opening an editor and committing to a long entry, a user hits `⌥ Space` (or the platform equivalent) from anywhere on their desktop, a translucent pill slides up, they type one line (or paste an image), hit Return, and the pop-up disappears. The entry is saved to the PHP API's MySQL store and, optionally, shown on a **single draggable live feed overlay** (six most recent entries) so recent punches stay glanceable without reopening the app — including over typical full-screen apps when the OS composites the overlay window above them. The user can drag that one window onto whichever monitor they prefer.

Design axis ranking (unchanged from v1):

1. **Friction below thought** — if capturing costs more mental cycles than typing into Slack, the app failed.
2. **Glanceable** — the overlay must stay visible and never obstruct work.
3. **Review-friendly** — once punches accumulate, the web-app has to turn them into something the user wants to revisit (heatmap, stats, tag browsing).
4. **Honest glass** — the aesthetic leans on OS-level translucency + backdrop-filter rather than hand-rolled fakes.

**Google Stitch (canonical UI reference):** Screen-level mocks and the **Honest Glass** design system for this product live in Stitch under the project **Interstitial Journal v2**. Stitch project ID for MCP/API calls (`list_screens`, `get_screen`, `get_project`, etc.) is **`16554277296517776375`** (resource name `projects/16554277296517776375`).

The v2 split moves the review and configuration surfaces to a browser-hosted React app, while the **native desktop client** — a Tauri-built installable application — owns the execution layer (hotkeys, overlays, screenshots, quick-punch pill). The PHP API is the single source of truth — both clients read and write through it.

**Roles, stated plainly:**

- The **web-app** is a website. You open it in a browser, it shows you your journal. It never touches your OS.
- The **desktop app** is a real installed app. It ships as a `.dmg` / `.msi` / `.AppImage`, you install it like any other native application, it shows up in your menu bar / system tray, and it works at the operating-system level to register hotkeys, paint translucent overlay windows, and capture screenshots. It is the *client for the system* — the thing that makes Interstitial Journal feel like a native feature of your machine rather than a tab in your browser.
- The **API** is the server that both clients point at.

This distinction is load-bearing for the whole design. Anywhere the spec says "tauri-app," read "the installable native desktop application." It is never a helper, a bridge, or an auxiliary — it is the OS-resident client that users will think of as "the app."

---

## 2. Architecture Overview

```
                   ┌───────────────────────────────┐
                   │   PHP API  (api/*.php)        │
                   │   MySQL + page-based routes   │
                   │   Single source of truth      │
                   └──────▲─────────────────▲──────┘
                          │ HTTPS/JSON      │ HTTPS/JSON
                          │                 │
   ┌──────────────────────┴──┐     ┌────────┴───────────────────────────┐
   │  web-app  (in a browser)│     │  Desktop App  (installed natively) │
   │  React + TypeScript     │     │  Tauri 2 · Rust host + React WebView│
   │  Served from the same   │◀───▶│  Ships as .dmg / .msi / .AppImage  │
   │  webroot as the API     │     │  Tray / menu-bar resident          │
   │                         │     │                                    │
   │  • Journal browser      │     │  • Global hotkeys                  │
   │  • Heatmap / Stats      │     │  • Translucent quick-punch window  │
   │  • Tags / Search        │     │  • Live feed overlay (6 entries, 1 win) │
   │  • Settings editor      │     │  • Screenshot capture              │
   │  • "Boot" desktop app   │     │  • OS keychain credential store    │
   │                         │     │  • Deep-link handler (ij://)       │
   └─────────────▲───────────┘     └────────────▲───────────────────────┘
                 │                              │
                 │   deep-link `ij://boot`      │
                 └────────handoff───────────────┘
                 (web-app asks the OS to launch
                  the installed desktop app)
```

- **Single source of truth:** the PHP API. Both clients are stateless with respect to entries; they hydrate from the API and write through it.
- **Two clients, two roles:**
  - The **web-app** is the *information and control* surface — it can run in any browser, including a remote one. It hosts the journal browser, heatmap, stats, tag views, and settings. It can also *boot* the installed desktop app via a custom `ij://` URL scheme.
  - The **desktop app** (Tauri) is the *execution / system* surface — a **real installed native application** that runs locally as a tray / menu-bar resident process. It registers global hotkeys, paints translucent quick-punch and overlay windows, captures screenshots, and performs OS integrations the browser can't. It stays dormant (no visible main window) most of the time. The user downloads an installer, double-clicks it, and the app is in their system from then on — launching at login, listening for hotkeys, ready.
- **Inter-client sync:** both clients subscribe to the same API. The web-app learns about new punches via an SSE stream from the API (`/api/stream.php`). The desktop app also subscribes to the same stream so a punch created from the web-app also flashes on the system overlays painted by the desktop app.

---

## 3. Deployment Targets

| Service | Platform | Artifact | Deploy mechanism |
|---|---|---|---|
| `api/` | Linux / Apache / PHP 8.2+ / MySQL 8 | Plain PHP files, no build step | FTP upload to webroot |
| `web-app/` | Any evergreen browser (Chrome, Safari, Firefox, Edge) | `dist/` static bundle (Vite build) | FTP upload to webroot sibling of `api/` |
| `tauri-app/` (the desktop application) | macOS 12+, Windows 10+, Linux (glibc ≥ 2.31) | Installable native bundles: `.dmg` / `.app` (macOS), `.msi` / `.exe` (Windows), `.AppImage` / `.deb` (Linux) | Downloaded by the user from the web-app's `/download` page, installed like any other desktop application |

The desktop app is a **first-class native application**, not a webview wrapper pointing at a hosted site. It is installed with the platform's normal mechanisms (drag to `/Applications`, run the MSI installer, `chmod +x` the AppImage), it has its own icon in the Dock / Start Menu / Applications menu, it opts into launch-at-login, and it runs even with the web-app's browser tab closed.

The repo is a **monorepo**, not a workspace. Each sub-project has its own `package.json`, its own lockfile, and its own `node_modules`. There's no root-level `package.json` and no hoisting. A change in one service doesn't force a rebuild in the others.

Local dev URLs:

- API: `https://localhost:8888/ij/api/<page>.php`
- Web-app: `http://localhost:5173` (Vite)
- Tauri-app: `http://localhost:1420` (Vite, loaded by the Tauri webview)

---

## 4. Service 1 — PHP Backend API (`api/`)

### 4.1 Routing model: page-based

Every endpoint is a single PHP file sitting under `api/`. There is **no front controller and no rewrite rule** — requests route directly to the filesystem via Apache. This keeps deployment trivial (drop files via FTP, done) and keeps each endpoint's surface area small and self-contained.

```
api/
├── _bootstrap.php         # shared: config, DB, JSON helpers, auth middleware
├── _db.php                # PDO factory (MySQL), schema migrator
├── _auth.php              # session/token validation
├── _json.php              # read_json_body(), send_json(), error envelope
├── _cors.php              # CORS preflight + headers
├── config.sample.php      # committed sample config (copied to config.php during deploy)
├── config.php             # deployment-local config (gitignored)
├── index.php              # 404 fallback when a non-existent file is hit
├── health.php             # GET → {status, service, timestamp, php, db}
├── session.php            # POST login, DELETE logout, GET whoami
├── entries.php            # GET list / POST create (dispatch on method)
├── entries_show.php       # GET /api/entries_show.php?id=…   (single read)
├── entries_update.php     # PATCH /api/entries_update.php?id=…
├── entries_delete.php     # DELETE /api/entries_delete.php?id=…
├── tags.php               # GET → [{tag, count}]
├── stats.php              # GET → computed stats block
├── heatmap.php            # GET ?from=…&to=… → day-bucketed counts
├── images.php             # POST multipart upload → {id, url}
├── images_show.php        # GET /api/images_show.php?id=… → binary + content-type
├── export.php             # GET ?format=md|json → downloadable
├── stream.php             # GET → SSE, text/event-stream
└── settings.php           # GET / PUT user settings blob
```

**Why `entries_show.php` / `entries_update.php` / `entries_delete.php` instead of `entries.php?id=…&method=…`?** Each file handles exactly one verb × resource pair, so permissions, error handling, and rate limits are easy to reason about per file. Shared behaviour lives in `_bootstrap.php`.

**`_bootstrap.php` responsibilities** (required at the top of every endpoint):

1. Load `config.php` (DB credentials, JWT secret, CORS allowlist, app base URL).
2. Start output buffering and set `Content-Type: application/json; charset=utf-8`.
3. Call `cors_headers()` from `_cors.php` — handles `OPTIONS` preflight and short-circuits.
4. Call `require_auth()` from `_auth.php` unless the file is listed in `$PUBLIC_ENDPOINTS` (`health.php`, `session.php`).
5. Register a shutdown function that converts uncaught exceptions into a JSON error envelope.

**Request / response contract:**

```jsonc
// Success
{ "ok": true, "data": <payload> }

// Error
{ "ok": false, "error": { "code": "invalid_tag", "message": "…", "details": {…} } }
```

Statuses use HTTP codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500`) and the JSON envelope is always present for errors (for 204 the body is empty).

### 4.2 Data model (MySQL 8, `utf8mb4`)

```sql
CREATE TABLE users (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,         -- bcrypt via password_hash()
  display_name  VARCHAR(120) NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  settings      JSON NOT NULL                  -- user preferences blob (see §4.6)
);

CREATE TABLE sessions (
  token       CHAR(64) PRIMARY KEY,            -- opaque random hex
  user_id     BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME(3) NOT NULL,
  user_agent  VARCHAR(255) NULL,
  source      ENUM('web','tauri') NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE entries (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL,             -- the punch timestamp (client-provided, server-validated)
  content     MEDIUMTEXT NOT NULL,
  source      ENUM('web','tauri','api') NOT NULL,
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, created_at DESC)
);

CREATE TABLE entry_tags (
  entry_id  BIGINT UNSIGNED NOT NULL,
  tag       VARCHAR(64) NOT NULL,               -- lowercased, normalized
  PRIMARY KEY (entry_id, tag),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  INDEX idx_tag (tag)
);

CREATE TABLE entry_images (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  entry_id   BIGINT UNSIGNED NOT NULL,
  mime       VARCHAR(64) NOT NULL,
  bytes      LONGBLOB NOT NULL,                 -- raw PNG bytes
  width      INT UNSIGNED NULL,
  height     INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);
```

Notes:

- **Tags are normalized in a side table**, not stored as a JSON array on the entry, so `/tag` counts and tag filters are pure SQL. `TagParser` still runs client-side to surface tag chips during typing, but the server re-parses `content` on `POST`/`PATCH` and is the authoritative source for `entry_tags`.
- **Images are stored as `LONGBLOB` in MySQL** for v2, matching v1's behaviour (images lived in the SwiftData store as `Data`). This keeps deployment single-tier (no S3 / filesystem coordination). A future migration may move blobs to disk — see §14.
- **`created_at` is client-provided** so that offline Tauri punches retain the moment they happened rather than the moment they synced. Server clamps it to `[now - 7 days, now + 5 minutes]` to prevent clock-skew abuse.

### 4.3 Authentication

Session-token auth, not JWT — simpler to revoke from the server, simpler to implement in PHP without pulling a JWT library.

1. `POST /api/session.php` with `{email, password}` → returns `{token, expires_at}` and sets an `HttpOnly; Secure; SameSite=Lax` cookie named `ij_session`.
2. All protected endpoints read `ij_session` from the cookie OR the `Authorization: Bearer <token>` header. The tauri-app uses the header form (it's not a browser, cookies are inconvenient). The web-app uses the cookie.
3. `DELETE /api/session.php` revokes the current token.
4. `GET /api/session.php` returns `{user, settings}` for bootstrapping the clients.

Tokens are 32 random bytes hex-encoded (64 chars), TTL 30 days, extended on each authenticated hit.

### 4.4 Endpoints (detail)

| File | Method(s) | Query / body | Response |
|---|---|---|---|
| `health.php` | `GET` | — | `{status, service, timestamp, php, db:{ok,latencyMs}}` |
| `session.php` | `POST` | `{email,password}` | `{token, expires_at, user}` |
| `session.php` | `DELETE` | — | `204` |
| `session.php` | `GET` | — | `{user, settings}` |
| `entries.php` | `GET` | `?from&to&tag&q&cursor&limit` | `{entries:[…], nextCursor}` |
| `entries.php` | `POST` | `{content, created_at, source, imageIds:[]}` | `201 {entry}` |
| `entries_show.php` | `GET` | `?id` | `{entry}` |
| `entries_update.php` | `PATCH` | `?id` body `{content}` | `{entry}` |
| `entries_delete.php` | `DELETE` | `?id` | `204` |
| `tags.php` | `GET` | — | `[{tag, count}]` sorted desc |
| `stats.php` | `GET` | `?tz=Europe/Amsterdam` | see §4.5 |
| `heatmap.php` | `GET` | `?from&to&tz` | `[{dayKey, count}]` |
| `images.php` | `POST` | multipart `file=<png>` | `{id, mime, width, height, url}` |
| `images_show.php` | `GET` | `?id` | binary, `Content-Type` = blob mime |
| `export.php` | `GET` | `?format=md\|json&from&to` | streamed file |
| `stream.php` | `GET` | — | SSE, see §4.7 |
| `settings.php` | `GET` | — | `{settings}` |
| `settings.php` | `PUT` | `{settings}` | `{settings}` |

**Pagination:** opaque cursor = `base64(created_at | id)`. Default `limit=50`, max `200`.

**Filtering:** `q` is a case-insensitive `LIKE %…%` on `entries.content`; `tag` joins to `entry_tags`; `from`/`to` are inclusive ISO-8601 dates bounded by server TZ.

### 4.5 Stats endpoint payload

Mirrors the v1 `ComputedStats` but computed server-side:

```jsonc
{
  "total": 1234,
  "today": 8,
  "thisWeek": 47,
  "dailyAverage": 3.4,
  "currentStreak": 12,
  "longestStreak": 41,
  "mostActiveHour": "14–15",
  "distinctTags": 27,
  "topTags": [{"tag":"work","count":312}, …]
}
```

Streaks: walk days in the user's `tz`, not UTC, so "today" is the user's today. `currentStreak` starts at today if today has ≥1 entry, else at yesterday (same rule as v1).

### 4.6 Settings blob

Stored as `users.settings JSON`. Shape mirrors v1's `AppState`:

```jsonc
{
  "overlay": {
    "showOnAllScreens": true,
    "alignment": "leading",   // "leading" | "center" | "trailing"
    "fontSize": 13,
    "opacity": 1.0,
    "textColor":   {"r":1, "g":1, "b":1, "a":0.88},
    "borderColor": {"r":0, "g":0, "b":0, "a":0.45},
    "theme": "mono"           // mono|warm|cool|midnight|sunset|forest|custom
  },
  "hotkeys": {
    "quickPunch": "Alt+Space",
    "openJournal": "Alt+Shift+Space",
    "screenshot":  "Cmd+Shift+S"    // or Ctrl+Shift+S on non-mac
  },
  "startup": {
    "launchAtLogin": true,
    "startHidden": true
  },
  "export": { "defaultFormat": "markdown" }
}
```

**Who owns what:** the web-app renders the Settings UI and writes the blob via `PUT /api/settings.php`. The tauri-app reads the blob on start and on `stream.php` `settings.updated` events, and re-registers hotkeys / rebuilds overlay windows from it.

### 4.7 Real-time stream (SSE)

`GET /api/stream.php` keeps the HTTP connection open and emits `text/event-stream` frames:

```
event: entry.created
data: {"id":123, "created_at":"…", "content":"…", "tags":["work"]}

event: entry.updated
data: {…}

event: entry.deleted
data: {"id":123}

event: settings.updated
data: {…full settings blob…}

: keepalive
```

Both the web-app and the tauri-app open this connection at startup. The server writes events from every mutation endpoint to a simple MySQL table `outbox` (`id, user_id, event, payload, created_at`); `stream.php` polls that table every 500 ms for the user's new rows and emits them. It's not low-latency pub/sub, but it's dependency-free PHP — no Redis, no ws server.

Heartbeat: a comment `:` line every 20 s to prevent idle-timeout kills by proxies.

### 4.8 CORS

`_cors.php`:

- `Access-Control-Allow-Origin`: echoed from `Origin` if present in `$ALLOWED_ORIGINS` (configured in `config.php`), else `*` is forbidden (auth'd endpoints require a known origin).
- `Access-Control-Allow-Credentials: true` (cookie auth).
- `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`.
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Client`.
- `OPTIONS` short-circuits with `204`.

The tauri-app uses `Authorization: Bearer` + `X-Client: tauri/<version>` so the origin check is relaxed for Tauri's `tauri://localhost` origin.

### 4.9 Config file

`api/config.sample.php` (committed):

```php
<?php
return [
  'db' => [
    'host' => 'localhost',
    'port' => 3306,
    'name' => 'interstitial_journal',
    'user' => 'ij',
    'pass' => 'CHANGE_ME',
  ],
  'allowedOrigins' => [
    'http://localhost:5173',
    'http://localhost:1420',
    'tauri://localhost',
    'https://ij.example.com',
  ],
  'tz' => 'Europe/Amsterdam',
  'sessionTtlDays' => 30,
  'maxImageBytes' => 10 * 1024 * 1024,
];
```

`config.php` is copied from the sample at deploy time and is in `.gitignore`.

---

## 5. Service 2 — Web-app (`web-app/`)

### 5.1 Stack

- **Framework:** React 19 + TypeScript (strict).
- **Build:** Vite 8.
- **Router:** `react-router-dom` v7 (to be added — not yet in `package.json`).
- **State:** React Query (TanStack Query) for server state + Zustand for ephemeral UI state. Both to be added.
- **Styling:** CSS modules + a handful of CSS custom properties for theme. No Tailwind. No component library — primitives are hand-rolled to match the v1 "honest glass" aesthetic.
- **API client:** `fetch`-based, typed, centralized in `src/api/client.ts`. All calls go through a `request<T>(path, init)` helper that handles auth, the `{ok, data|error}` envelope, and error surfacing.
- **Deployment:** `npm run build` produces `web-app/dist/`, uploaded via FTP to the same webroot as `api/` (sibling directory). The web-app's `VITE_API_BASE` is set at build time for prod (`/api` when deployed together, `https://localhost:8888/ij/api` for local dev).

### 5.2 Routes

| Path | View | Purpose |
|---|---|---|
| `/login` | `LoginView` | Email + password; redirects to `/today` on success |
| `/today` | `BrowserView filter={today}` | The default landing |
| `/yesterday` | `BrowserView filter={yesterday}` | |
| `/last-7` | `BrowserView filter={last7}` | |
| `/all` | `BrowserView filter={all}` | |
| `/tag/:tag` | `BrowserView filter={tag}` | |
| `/heatmap` | `HeatmapView` | 53-week contribution grid |
| `/stats` | `StatsView` | Stat cards + top tags |
| `/settings` | `SettingsView` | Overlay, hotkeys, startup, export |
| `/download` | `DownloadView` | Platform-detected tauri-app installer links |
| `/boot` | `BootView` | Triggers the `ij://` URL and shows a "launching…" state |
| `*` | `NotFoundView` | |

The app shell is a `NavigationSplitView`-like layout rebuilt in HTML: a left sidebar (same sections as v1 — Entries / Insights / Tags / App) and a detail pane to the right. The sidebar is collapsible below 900 px viewport width.

### 5.3 Views (mapped from v1 sections)

- **BrowserView** — grouped-by-day entry list with a search bar, keyboard navigation, context menu (copy/delete), and a right-hand detail panel (view/edit/delete). Matches v1 §3.3.3 functionally.
- **HeatmapView** — 53×7 grid, hover tooltip, legend. Data from `GET /api/heatmap.php`. Matches v1 §3.3.4.
- **StatsView** — `StatCard` grid + top-tags bar chart. Data from `GET /api/stats.php`. Matches v1 §3.3.5.
- **SettingsView** — grouped form editing the settings blob. Writes back via `PUT /api/settings.php`. Matches v1 §3.3.6 *minus* the "Launch at login" control, which moves to the tauri-app's settings (it's a machine-local flag, not a server-persisted one).
- **DownloadView** — shows platform installer links (`/downloads/ij-{version}-{platform}.{ext}`) served by the webroot; detects platform from UA.
- **BootView** — triggers `window.location.href = 'ij://boot?token=…'` (with the current session token as a query param, one-time-use, TTL 60 s) to hand off to the tauri-app. Shows a fallback "If nothing happened, download the desktop app" link after 3 s.

### 5.4 Booting the tauri-app

Handoff protocol:

1. User clicks **Boot execution layer** in the web-app header or on `/boot`.
2. Web-app calls `POST /api/session.php?boot=1` which returns a **one-shot token** (`source=tauri`, `expires_at = now + 60s`, `uses_left = 1`).
3. Web-app navigates to `ij://boot?token=<one-shot>&api=<api_base_url>`.
4. The tauri-app is registered as the handler for the `ij://` scheme (see §6.5). On receiving the URL it exchanges the one-shot token for a long-lived `source=tauri` token via `POST /api/session.php?exchange=1`, stores it in the OS keychain (see §6.7), and marks itself "booted."
5. Once booted, the tauri-app registers global hotkeys, paints overlays, and parks itself in the tray. The web-app is notified via the SSE stream (`event: client.booted`).

This handoff means the user types their password once, in the web-app, and the desktop app never shows a login screen.

### 5.5 Real-time updates

On mount the app shell opens `GET /api/stream.php`. Events dispatch into React Query's cache:

- `entry.created` / `entry.updated` → invalidate the relevant list queries and prepend to `today`.
- `entry.deleted` → optimistic removal.
- `settings.updated` → replace the cached settings blob.

On disconnect, the app retries with exponential backoff capped at 30 s, and shows a subtle "Reconnecting…" bar.

### 5.6 File layout (`web-app/src/`)

```
src/
├── main.tsx              # Vite entrypoint
├── App.tsx               # Router + providers (QueryClient, Auth, SSE)
├── api/
│   ├── client.ts         # fetch wrapper, auth, envelope unwrap
│   ├── endpoints.ts      # typed endpoint fns: getEntries, postEntry, …
│   └── stream.ts         # SSE client, reconnect, dispatch
├── auth/
│   ├── AuthProvider.tsx  # cookie-backed session
│   └── useAuth.ts
├── state/
│   └── store.ts          # Zustand: sidebar collapsed, selected entry, …
├── views/
│   ├── LoginView.tsx
│   ├── BrowserView.tsx
│   ├── HeatmapView.tsx
│   ├── StatsView.tsx
│   ├── SettingsView.tsx
│   ├── DownloadView.tsx
│   └── BootView.tsx
├── components/
│   ├── Sidebar.tsx
│   ├── EntryRow.tsx
│   ├── EntryDetail.tsx
│   ├── TagChip.tsx
│   ├── StatCard.tsx
│   └── HeatmapCell.tsx
├── lib/
│   ├── tagParser.ts      # mirror of api-side parser for optimistic UI
│   ├── dates.ts          # bucket helpers, TZ-aware
│   └── format.ts
├── styles/
│   └── tokens.css        # CSS custom properties (glass palette, spacing)
└── vite-env.d.ts
```

### 5.7 Server-state polling (web-app)

TanStack React Query drives all authenticated server reads (`entries`, single `entry`, `tags`, `stats`, `heatmap`, and any future list/detail queries). In addition to SSE-driven cache updates (§5.5), the web-app **always** polls the API on a timer so the UI converges with the server even when the event stream is disconnected, unavailable, or events were missed.

**Intervals (Page Visibility API):**

| Document state | Poll interval |
|----------------|---------------|
| Tab/window **visible** (`document.visibilityState === 'visible'`) | **3 seconds** |
| Tab/window **hidden** (another tab focused, window minimized, etc.) | **10 seconds** |

**Return to foreground:** when the document becomes visible again after being hidden, the app **immediately** refetches all **active** queries once (no waiting for the next interval tick), so the page acts like a manual refresh without reloading.

**Implementation notes:**

- Polling uses **one** app-level timer (chained `setTimeout`) that calls `refetchQueries({ type: 'active' })` on each tick, with the delay chosen from `document.visibilityState` (3 s vs 10 s). The timer is reset on `visibilitychange` so the interval switches immediately. This avoids React Query’s `refetchInterval`, which is scheduled **per observer** and can duplicate network work when more than one observer is attached to the same query (e.g. development Strict Mode).
- `refetchOnWindowFocus` stays **off** for queries; foreground sync uses `visibilitychange` + immediate `refetchQueries` so behavior matches the table above without stacking window-focus refetches.
- Mutations and local-only UI state (e.g. settings stubbed to `localStorage`) are unaffected.

---

## 6. Service 3 — Desktop App (`tauri-app/`)

### 6.1 Role

`tauri-app/` is **the native desktop application** — the product's system client. It ships as an installable bundle (`.dmg` / `.msi` / `.AppImage`), the user installs it once, and from then on it behaves like any other native app on their machine: it has a proper application icon, it launches at login (if enabled), it lives in the menu bar (macOS) or system tray (Windows / Linux), and it's what users will refer to as "the Interstitial Journal app" in conversation.

It is **not** a remote-controlled helper of the web-app. It's a standalone desktop client with its own identity that happens to talk to the same API. The web-app can *summon* it (via `ij://boot`) because the OS knows the desktop app is installed and has registered the URL scheme — but once installed, the desktop app is fully usable without the web-app ever being opened.

It is the **execution layer** / **system client**. It stays resident in the tray. It has no main window by default; the only things it paints are:

1. The **Quick-Punch pop-up** when the hotkey fires.
2. One **live feed overlay** window when enabled — always-on-top, draggable across displays, showing only the **six** latest entries (not duplicated per monitor).
3. A **tray / menu-bar** icon with a small menu.
4. A tiny **settings-only window** for *local* preferences (launch-at-login, clear credentials, set API base). Everything else is edited in the web-app.

The desktop app is therefore "dormant but active" — installed, registered, listening, painting nothing until needed. This dormancy is deliberate: the app should feel like part of the OS, not another window fighting for attention.

### 6.2 Stack

- **Shell:** Tauri 2 (Rust host + webview).
- **Frontend:** React 19 + TypeScript, loaded by Tauri's webview (the quick-punch and overlay UIs are HTML/CSS inside a transparent Tauri window).
- **Rust crates** (in `src-tauri/Cargo.toml`):
  - `tauri = "2"`
  - `tauri-plugin-global-shortcut = "2"` — global hotkey registration.
  - `tauri-plugin-autostart = "2"` — launch at login.
  - `tauri-plugin-deep-link = "2"` — `ij://` URL scheme handler.
  - `tauri-plugin-single-instance = "2"` — the second launch reactivates the first instance instead of spawning a new one.
  - `tauri-plugin-notification = "2"` — for error surfacing.
  - `tauri-plugin-store = "2"` — local settings (API base, cached session).
  - `tauri-plugin-os = "2"` — platform detection.
  - `screenshots = "0.8"` (Rust) — cross-platform screen capture.
  - `keyring = "3"` — OS keychain access for the session token.
  - `reqwest = "0.12"` (blocking or tokio) — API client from Rust side (used for background sync).

These are *additions* to the current bootstrapped `Cargo.toml`, which only has `tauri`, `tauri-plugin-opener`, `serde`, `serde_json`. They need to be added as v2 is built out.

### 6.3 Windows

| ID | Purpose | Always-on-top | Transparent | Decorated | Skip taskbar |
|---|---|---|---|---|---|
| `quick-punch` | The pill pop-up | ✅ | ✅ | ❌ | ✅ |
| `live-feed` | Live feed overlay — six latest entries, single window, draggable onto any display | ✅ | ✅ | ❌ | ✅ |
| `local-settings` | Local prefs window | ❌ | ❌ | ✅ | ❌ |

All windows are created programmatically in Rust using `WebviewWindowBuilder`; none are declared in `tauri.conf.json`'s `app.windows` array (that default window entry is removed — the app is windowless on launch).

**Quick-punch window:**

- Size: 680 × 380 px content area (matches v1's panel).
- Position: centered horizontally on the active screen; vertically at `8 %` from the bottom of the work area.
- Transparency: `transparent: true`, window background `rgba(0,0,0,0)`; the pill itself uses `backdrop-filter: blur(40px) saturate(180%)` plus a border hairline — the "honest glass" compromise for non-macOS platforms. On macOS the `vibrancy` option is used via `window-vibrancy` crate for real system material.
- Focus: on show, call `set_focus()` then post-message to the webview to focus the `<textarea>`.
- Dismissal: `Esc` via `onKeyDown` handler; also hide on window blur (matching v1's `resignKey` behaviour).
- Does not appear in the Dock / Alt-Tab (`skipTaskbar: true`, on macOS `accessory` activation policy via `tauri-plugin-macos-accessory`).

**Live feed overlay window (`live-feed`):**

- **Content:** A **concise live feed** of the **six most recent** journal entries only (newest first). No scrolling; long text **truncates** with ellipsis. The desktop app subscribes to the same SSE stream as the web-app and updates rows on `entry.created` / relevant mutations so the feed stays live.
- **Stacking:** **Always-on-top** so the feed sits **above normal windows and typical full-screen (space-filling) apps**, keeping it glanceable during focus work or presentations. *Platform reality:* composited overlay windows behave like other HUD-level UI; **exclusive full-screen** (some games, display capture) can still hide OS-level windows — same limitation class as menu-bar widgets.
- **Single instance:** Exactly **one** `live-feed` window when the overlay is enabled — **not** cloned per monitor. The user **drags** it to another display if they want it elsewhere; the OS keeps a single global window frame.
- **Geometry:** Content **max width 420 px**; height follows **up to six** single-line rows (no fixed 300 × 138 px — v1’s compact strip is superseded by this layout).
- **Default position:** **32 px** inset from the **top** and **left** of the **primary** monitor (or first available display); after the user drags, the window position is whatever the OS reports for that single window (future: persist `{x,y}` in local store if needed).
- **Dragging:** The panel is **user-draggable** across the virtual desktop (all displays). **Only** the **drag handle** initiates `start_dragging()` (not the text rows). The handle is a slim vertical strip on the **leading** edge (see canonical markup: `.drag-handle-dots`, absolutely positioned, `cursor: move`). If a single webview cannot combine global click-through with a small hit target, reuse the v1 pattern: `set_ignore_cursor_events(true)` on the main window plus a narrow **child** window aligned to the handle that receives `mousedown` → `start_dragging()`.
- **Click-through:** The feed must **not** steal clicks from apps underneath. Outer shell: **`pointer-events: none`**, **`user-select: none`**. Only the drag handle uses **`pointer-events: auto`** (and optional hover affordance).
- **Cross-space / virtual desktops:** macOS `NSWindow.collectionBehavior = [.canJoinAllSpaces, .stationary]` via Rust post-setup; Windows `SetWindowPos` with `HWND_TOPMOST`; Linux `_NET_WM_STATE_STICKY` + `_NET_WM_STATE_ABOVE`.

**Canonical markup (Tailwind)** — the overlay route reproduces this structure and class names; theme colours flow from `settings.overlay` / `themes.ts` into the existing text-glow tokens.

```html
<!-- Top-Left Overlay Inset Container -->
<div class="fixed top-8 left-8 w-full max-w-[420px] pointer-events-none select-none">
  <div class="relative flex h-auto flex-col group/design-root">
    <!-- Subtle Drag Handle Indicator (Top-Left) -->
    <div class="absolute -left-4 top-1 w-2 h-12 drag-handle-dots opacity-40 group-hover/design-root:opacity-100 transition-opacity cursor-move pointer-events-auto"></div>
    <div class="layout-container flex h-full grow flex-col">
      <div class="flex flex-1 flex-col">
        <div class="layout-content-container flex flex-col flex-1 gap-1">
          <!-- Entry 1 -->
          <div class="flex items-center gap-2 px-2 py-0.5 group hover:pointer-events-auto whitespace-nowrap overflow-hidden">
            <span class="text-white/60 text-[12px] font-mono shrink-0 text-glow uppercase tracking-wider">10:45 AM</span>
            <p class="text-white text-body-sm font-medium truncate text-glow">Wireframe concepts — Finalizing the 'Honest Glass' depth model for the primary canvas.</p>
          </div>
          <!-- Entry 2 -->
          <div class="flex items-center gap-2 px-2 py-0.5 group whitespace-nowrap overflow-hidden">
            <span class="text-white/60 text-[12px] font-mono shrink-0 text-glow uppercase tracking-wider">09:15 AM</span>
            <p class="text-white text-body-sm font-medium truncate text-glow">Standup alignment — Discussed font legibility against high-saturation background blurs.</p>
          </div>
          <!-- Entry 3 -->
          <div class="flex items-center gap-2 px-2 py-0.5 group whitespace-nowrap overflow-hidden">
            <span class="text-white/60 text-[12px] font-mono shrink-0 text-glow uppercase tracking-wider">08:30 AM</span>
            <p class="text-white text-body-sm font-medium truncate text-glow">Coffee & Focus — Defining the color roles for the amber 'Warm' preset.</p>
          </div>
          <!-- Entries 4–6: same row pattern; data-bound to the remaining slots in the six-entry cap -->
        </div>
      </div>
    </div>
  </div>
</div>
```

**Local-settings window:**

- A small conventional window (480 × 320). Opened from the tray menu. Shows fields for API base URL, "Log out & clear credentials," and "Launch at login" toggle.

### 6.4 Global hotkeys

Registered on boot via `tauri-plugin-global-shortcut`:

| Action | Default | Handler |
|---|---|---|
| `quickPunch` | `Alt+Space` | Show + focus `quick-punch` window |
| `openJournal` | `Alt+Shift+Space` | Open the web-app in the default browser (`shell.open('https://ij.example.com/today')`) |
| `screenshot` | `Cmd+Shift+S` (mac) / `Ctrl+Shift+S` (win/linux) | Capture current display → attach to the quick-punch draft; also works while the pop-up is open |

Shortcuts are read from the user settings blob (§4.6) and re-registered on `settings.updated` SSE events. Re-registration uses `unregister_all()` followed by `register()` on each binding to avoid stacking.

### 6.5 Deep link (`ij://`)

Registered via `tauri-plugin-deep-link`. On cold-launch from a URL, or on a second-instance run with a URL argument, the plugin emits an event to the Rust side.

Supported URLs:

- `ij://boot?token=<one-shot>&api=<base>` — exchange token, store, register hotkeys, go resident.
- `ij://punch?content=<urlencoded>` — create a punch from an external script / keyboard-maestro / iOS shortcut, no UI.
- `ij://open` — just activate and show the tray menu.

### 6.6 Screenshots

Rust side, using the `screenshots` crate:

1. Enumerate `Screen::all()`, pick the one whose `DisplayInfo.frequency` and mouse position match (best-effort equivalent of v1's "display under the cursor").
2. `screen.capture() -> Result<Image>` → PNG-encode via `image::ImageEncoder`.
3. Hand bytes to the JS side via a `capture_screenshot` Tauri command; the frontend appends a data URL to the thumbnail strip and, on submit, uploads via `POST /api/images.php`.

Permissions:

- macOS: Screen Recording TCC prompt on first call. Same error-mapping + deep-link-to-Settings as v1 (`x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture`).
- Windows: no prompt.
- Linux (X11): `XGetImage` works; Wayland requires `xdg-desktop-portal`, which the `screenshots` crate handles where available.

### 6.7 Credential storage

The long-lived session token from the `ij://boot` handshake is stored in the OS keychain via the `keyring` crate: service `interstitial-journal`, account `<user_email>`. It is read on every launch and injected as `Authorization: Bearer …` on all API calls. Clearing credentials (local-settings → "Log out") deletes the keychain entry and stops the hotkey listener.

If the keychain is unavailable (e.g., headless Linux without `SecretService`), the token falls back to `tauri-plugin-store`'s encrypted-at-rest JSON, which is less secure but functional.

### 6.8 Tray menu

Built via `tauri::tray::TrayIconBuilder`:

```
Interstitial Journal
─────────────────────────
New Punch                   ⌥ Space
Open Journal in browser     ⌥ ⇧ Space
─────────────────────────
Show live overlay    [ ]
─────────────────────────
Local settings…
─────────────────────────
Quit
```

"Show live overlay" reflects and toggles `settings.overlay.showOnAllScreens` locally but doesn't persist back to the server (local-machine decision, matches v1's behaviour where this flag wasn't in the settings pane either).

### 6.9 Frontend layout (`tauri-app/src/`)

```
src/
├── main.tsx                # Vite entry; router picks route by window label
├── routes/
│   ├── QuickPunch.tsx      # loaded in the quick-punch window
│   ├── Overlay.tsx         # loaded in each overlay window
│   └── LocalSettings.tsx   # loaded in the local-settings window
├── ipc/
│   ├── commands.ts         # Tauri command wrappers (invoke)
│   └── events.ts           # listen() wrappers
├── api/
│   └── client.ts           # shared with web-app conceptually, local copy
├── components/
│   ├── PunchPill.tsx       # the translucent capsule
│   ├── ThumbnailStrip.tsx
│   └── PunchRow.tsx        # overlay feed row (mono time + truncated body; canonical §6.3 markup)
└── styles/tokens.css       # shared palette / glass tokens
```

The window to render is decided by the Tauri window label (`quick-punch` / `live-feed` / `local-settings`) passed via `useWindow()` and routed in `main.tsx`.

### 6.10 Rust layer (`src-tauri/src/`)

```
src/
├── main.rs                  # thin; calls into lib
├── lib.rs                   # setup: plugins, tray, windows, deep-link handler
├── commands/                # #[tauri::command] fns
│   ├── capture.rs           # capture_screenshot
│   ├── session.rs           # exchange_token, logout
│   ├── window.rs            # show_quick_punch, hide_quick_punch
│   └── settings.rs          # get_local_settings, set_local_settings
├── overlay/
│   ├── manager.rs           # single live-feed window, show/hide from tray
│   └── click_through.rs     # platform-specific hit-test tweaks
├── hotkeys.rs               # register/unregister, apply from settings
├── sse.rs                   # background SSE client → tauri events
└── keychain.rs              # keyring abstraction
```

---

## 7. Shared Concerns

### 7.1 Tag parsing & normalization

Tags have three distinct representations; each has exactly one job. The round-trip below is the contract every surface must honour.

| Layer        | Prefix | Example        | Used by                                                |
| ------------ | :----: | -------------- | ------------------------------------------------------ |
| Input grammar | `/`   | `/design-system` | What the human types into any composer (web pill, desktop pill, CLI). |
| Storage form | none   | `design-system` | Rows in `tags.tag` and `entry_tags.tag` (bare, lowercase, unique). |
| Display form | `#`    | `#design-system` | Every rendered chip, inline highlight, sidebar link, breadcrumb.     |

#### Input grammar (authoritative)

The grammar is identical to v1 §4.3. Tag tokens must follow whitespace or the start of the string:

```
/work        → "work"
/dev-ops     → "dev-ops"
/1hour       → ∅  (must start with a letter)
/work!       → "work"   (trailing punctuation ignored)
not/atag     → ∅  (must follow whitespace or start-of-string)
```

- Server-side: `api/_tags.php::parse_tags(string): array<string>` is called from `entries.php` on create and `entries_update.php` on update. It is the source of truth for the rows in `entry_tags`.
- Client-side (web-app + tauri-app): `src/lib/tagParser.ts` mirrors the algorithm and exposes:
  - `parseTags(content)` → bare tag strings (matches the server),
  - `segmentContent(content)` → alternating `{kind:"text"}` / `{kind:"tag", tag, raw, display}` segments for inline rendering,
  - `normalizeTag(raw)` → strips `/` or `#` prefixes, lowercases, rejects invalid inputs,
  - `displayTag(tag)` → `#tag` (the *only* way the UI renders tags),
  - `inputTag(tag)` → `/tag` (round-trip back into composer text),
  - `toDisplayContent(content)` → replaces every `/tag` in the raw body with `#tag` (used by copy-to-clipboard),
  - `tagRoute(tag)` → canonical deep-link path (`/tag/:encoded`),
  - `tagVariant(tag)` → deterministic color variant (`blue | amber | emerald | purple | rose | cyan | slate`) so a given tag paints the same hue in chips, inline highlights, and the side-nav dot.

#### Display normalization (UI rule)

**Tags are never rendered to the user with the `/` prefix.** The input prefix exists only because `/` is unambiguous in prose (`work/atag` must not match). Everywhere the UI shows a tag — entry cards, inline prose highlights, the detail panel, the sidebar, tag chips, stat leaderboards — it uses the `#tag` form produced by `displayTag()`.

Concretely:

- `TagChip` (pill) and `TagInline` (in-prose highlight) both render `#tag` and both colour their background/foreground from `tagVariant()`.
- `EntryCard` feeds every segment through `segmentContent()` so `"Finishing the wireframes for the /design-system"` paints `"Finishing the wireframes for the #design-system"` with the `#design-system` portion highlighted in the blue variant.
- Copy-to-clipboard uses `toDisplayContent()` so pasting an entry yields `#tag` text, matching what the user sees.
- `EntryComposer` (web + tauri) accepts either prefix on paste but always produces `/tag` back into the textarea so the server-side grammar stays stable.

This one-way transformation (`/` on the way in, `#` on the way out) keeps the grammar unambiguous while giving the UI the visual affordance everyone associates with tagging.

### 7.2 Themes

The seven presets from v1 (`mono / warm / cool / midnight / sunset / forest / custom`) carry over. They're serialized as named strings in the settings blob; the actual `{text, border}` color pairs are computed client-side from a shared `themes.ts` table. Editing the raw color pickers in the web-app snaps `theme` to `"custom"` and writes the RGBA pair into `settings.overlay.textColor` / `borderColor`.

### 7.3 Export

Server-side (`api/export.php`), so it works from either client:

- `format=json` → streams a JSON array of entries (`{timestamp, content, tags, imageRefs}`). Images are referenced by `GET /api/images_show.php?id=…` URLs, *not* embedded as base64 (v2 improvement over v1, which omitted them).
- `format=md` → streams a Markdown document grouped by day (matches v1 format) with image links appended inline.
- `?from` and `?to` clamp the range.

### 7.4 Time zones

All timestamps are stored as UTC (`DATETIME(3)` in MySQL with explicit UTC) but every *presentation* surface (heatmap day buckets, streak computation, "today") uses the user's `settings.tz`, which defaults to the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` on first login.

### 7.5 Versioning

Each service has its own `version` field:

- `api/` — `health.php` returns `{version: "2.0.0"}` from a constant in `_bootstrap.php`.
- `web-app/` — `package.json` version injected via Vite define; shown in `/settings` → "About".
- `tauri-app/` — `src-tauri/tauri.conf.json` `version`; shown in the local-settings window.

Compatibility: the web-app and tauri-app both send `X-IJ-Client-Version` and the API sends `X-IJ-Api-Version`. A major mismatch shows a banner prompting the user to refresh / update.

---

## 8. Security

- **Transport:** HTTPS only in production. CORS allowlist is explicit (§4.8). HSTS set on the `api/` responses (`Strict-Transport-Security: max-age=31536000; includeSubDomains`).
- **Password hashing:** `password_hash($pw, PASSWORD_BCRYPT)` with cost `12`. `password_verify` on login.
- **SQLi:** every PHP endpoint uses PDO with named-parameter prepared statements. No string interpolation into SQL anywhere.
- **XSS:** the web-app renders entry content as plain `Text` (React's default escaping). No `dangerouslySetInnerHTML` anywhere in v2.
- **Image uploads:** server validates the first bytes match PNG magic (`89 50 4E 47`), caps at `config.maxImageBytes` (10 MB default), and rejects anything else with `422 invalid_image`.
- **Deep-link tokens:** single-use, 60-second TTL, bound to `source=tauri`, rate-limited to 5 exchanges per minute per IP.
- **CSRF:** cookie-auth endpoints require either (a) a `SameSite=Lax` cookie + a non-GET request type (`POST`/`PATCH`/`DELETE`), or (b) the `X-Client` header set to a known value. Since the web-app is a SPA that always sends the header, and browsers reject cross-site `SameSite=Lax` cookies on non-top-level nav, this is sufficient without per-request CSRF tokens.
- **Sandbox (tauri):** `app.security.csp` is set to a strict policy (`default-src 'self' https://<api-host>; img-src 'self' data: https://<api-host>; style-src 'self' 'unsafe-inline'`). No remote script loading.

---

## 9. Monorepo Layout

```
ij/
├── README.md
├── SPEC.md                  # this file
├── .gitignore
│
├── api/                     # Service 1 — PHP backend
│   ├── _bootstrap.php
│   ├── _db.php
│   ├── _auth.php
│   ├── _json.php
│   ├── _cors.php
│   ├── _tags.php
│   ├── config.sample.php
│   ├── config.php           (gitignored)
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   ├── 002_outbox.sql
│   │   └── migrate.php
│   ├── index.php
│   ├── health.php
│   ├── session.php
│   ├── entries.php
│   ├── entries_show.php
│   ├── entries_update.php
│   ├── entries_delete.php
│   ├── tags.php
│   ├── stats.php
│   ├── heatmap.php
│   ├── images.php
│   ├── images_show.php
│   ├── export.php
│   ├── stream.php
│   └── settings.php
│
├── web-app/                 # Service 2 — React controller
│   ├── package.json
│   ├── tsconfig.*.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   └── src/                 # see §5.6
│
└── tauri-app/               # Service 3 — Tauri execution layer
    ├── package.json
    ├── tsconfig*.json
    ├── vite.config.ts
    ├── index.html
    ├── src/                 # see §6.9
    └── src-tauri/
        ├── Cargo.toml
        ├── tauri.conf.json
        ├── build.rs
        ├── capabilities/
        ├── icons/
        └── src/             # see §6.10
```

No root `package.json`. No workspaces. Each service is independently installable and deployable.

---

## 10. Build & Run

### 10.1 API

Deploy: FTP upload `api/` to the webroot. Run `php api/migrations/migrate.php` on the server once per deployment (idempotent).

Local dev: Apache vhost or `php -S localhost:8000 -t api/`. Create `api/config.php` from the sample, point it at a local MySQL.

Smoke-test:

```sh
curl -sS https://localhost:8888/ij/api/health.php
# {"status":"ok","service":"interstitial-journal-api",…}
```

### 10.2 Web-app

```sh
cd web-app
npm install
npm run dev          # http://localhost:5173
npm run build        # → web-app/dist/
```

Environment:

- `VITE_API_BASE` — default `https://localhost:8888/ij/api` in dev; set at build time for prod (e.g., `/api` or `https://ij.example.com/api`).

Deploy: FTP upload `web-app/dist/` contents to the webroot (sibling to `api/`).

### 10.3 Desktop app (tauri-app)

Requires Rust (`rustup.rs`) and platform toolchains (Xcode CLT / MSVC / `webkit2gtk-4.1-dev`).

```sh
cd tauri-app
npm install
npm run tauri dev    # dev build — launches the real desktop app with hot reload
npm run tauri build  # → native installer bundles in src-tauri/target/release/bundle/
```

`tauri dev` does not open a browser tab — it launches the actual native application, identical in window-management, tray, and hotkey behaviour to the installed build, just with a Vite-served webview inside and source-map debugging enabled.

Generated installer bundles:

- macOS: `.app` + `.dmg`
- Windows: `.msi` + `.exe`
- Linux: `.AppImage` + `.deb`

These are the artifacts users actually install. Signing / notarization is out of scope for v2 bootstrap; bundles are distributed un-notarized initially with a README note about Gatekeeper / SmartScreen bypass. Signing is first-priority for v2.1.

### 10.4 End-to-end smoke

With all three services running:

1. Browse to `http://localhost:5173`, log in (or sign up via a future `/signup` route).
2. Click **Boot execution layer** → the tauri-app launches, lands in the tray, registers `⌥ Space`.
3. Press `⌥ Space` anywhere → pill appears, type "shipped the v2 spec /meta", Enter.
4. The web-app's `/today` updates in < 1 s (via SSE).
5. The live feed window shows the new punch at the **top of the six-entry feed**.
6. `⌥ ⇧ Space` opens the web-app in the default browser at `/today`.

---

## 11. Animation & Timing Reference

Carried over from v1 §9, expressed in CSS / Framer Motion rather than SwiftUI springs:

| Where | Behaviour |
|---|---|
| Quick-punch pop-up entry | `transform: scale(.6→1); opacity: .72→1` over 280 ms, `cubic-bezier(.2,.8,.2,1)` |
| Thumbnail insertion | slide-in + fade over 320 ms |
| Error shake + fade | 6 sine cycles @ 4 px amplitude over 360 ms |
| Thumbnail removal | 180 ms ease-in-out |
| Overlay row insertion | 160 ms fade + 4 px slide-down |

---

## 12. Concurrency / Async Model

- **API:** standard per-request PHP. No shared state except MySQL. `stream.php` uses `session_write_close()` then a polling loop on the `outbox` table; `ignore_user_abort(false)` + `flush()` after each event.
- **Web-app:** React Query for server state with visibility-aware polling (§5.7), one SSE connection, retry with exponential backoff. All mutations optimistic with rollback on server error.
- **Tauri-app Rust side:** Tokio runtime. The SSE subscriber, the keyring calls, and the screenshot capture run off the main thread. Tauri commands are `async` and awaited from JS. The global-shortcut and tray callbacks must hop to Tokio via `tauri::async_runtime::spawn` before doing any I/O.

---

## 13. Known Limitations (v2 bootstrap)

- **No tests.** Manual verification only. Unit tests for `tagParser.ts`, streak computation, and date bucketing are a priority for v2.1.
- **No user-settable hotkeys UI yet.** The wiring (settings blob → re-register) is in place; the form fields are not.
- **Single-user server.** The schema supports `users`, but there's no `/signup` route and no admin UI. Bootstrapped via a manual `INSERT` during deploy.
- **No offline queue in tauri-app.** If the API is unreachable when the user punches, submission errors; it doesn't queue-and-retry. Planned.
- **No image thumbnails in the DB.** The full PNG is served back on every render, resulting in large transfers for lots of screenshots. Server-side thumbnailing planned for v2.2.
- **SSE via polling the outbox** has a 500 ms latency floor. Fine for one user, not scalable; swap for Redis pub/sub later.
- **Tauri bundles unsigned** in v2 bootstrap. Users will see Gatekeeper / SmartScreen warnings.

---

## 14. Roadmap (Deferred)

1. `/signup` flow + email verification.
2. Offline queue in tauri-app, replayed on reconnect.
3. Image thumbnailing at upload + CDN-friendly `ETag` / `Cache-Control` on `images_show.php`.
4. Move image blobs to disk (`storage/images/<sha256>.png`) once hosting supports it; DB keeps only the hash + metadata.
5. Customizable hotkey UI in Settings.
6. Unit tests for `tagParser`, `ComputedStats`-equivalent, `EntryBucket.contains`, export serializers.
7. Keyboard navigation in BrowserView (`⌘F` focus search, arrow keys, `⌘⌫` delete).
8. Tag auto-complete in the quick-punch pop-up.
9. Weekly / monthly digests in Stats.
10. Markdown rendering for `Entry.content` (view mode; raw text in edit mode).
11. Real-time via WebSocket / Redis pub/sub instead of SSE-on-outbox polling.
12. Multi-device sync conflict handling (last-write-wins is good enough for v2).
13. macOS Vibrancy via `window-vibrancy` crate for the pill and overlays; Windows Mica / Acrylic backdrop.
14. iOS companion via Shortcuts → `POST /api/entries.php` with an API key.

---

## 15. Glossary

- **Punch** — a single journal entry.
- **Quick-Punch Pop-up** — the global-hotkey-summoned pill, painted by the tauri-app.
- **Live Overlay** — the always-on-top, **draggable** **live feed** window (`live-feed`) showing only the **six** latest punches (canonical layout §6.3), painted by the tauri-app above normal and typical full-screen apps where the OS allows composited windows; **one** instance, movable across displays.
- **Boot** — the act of the web-app summoning the installed desktop app via `ij://boot`, exchanging a one-shot token for a long-lived session, and handing off.
- **Desktop app** — the native installable Tauri application in `tauri-app/`. This is *the* app for the product — what users download, install, and leave running. Synonyms in this document: "the system client," "the execution layer."
- **Execution layer / System client** — the desktop app, because it runs OS-level code (hotkeys, overlays, screenshots) and is what interfaces the product with the user's machine.
- **Controller** — the web-app, because it's where the user reads, searches, configures, and boots.
- **Page-based API** — routing by filesystem layout (`api/entries.php`) rather than a front-controller with a router, chosen so FTP deploys are trivial.
- **Outbox** — the MySQL table the API writes mutation events into so `stream.php` can stream them to connected clients without a real message bus.
- **Dormant** — the tauri-app's default state: resident in the tray, hotkeys listening, no visible window.
- **Honest glass** — the aesthetic directive to use real OS vibrancy / backdrop-filter rather than a painted approximation.
- **Bucket** — a named time window (today / yesterday / last 7 / all) used in the sidebar.
- **Tag** — a `/slug` token parsed out of an entry's content; lowercase, deduped per entry, authoritative row in `entry_tags`.
- **Preset / Theme** — a named text + border colour pair for the overlay + pop-up.
