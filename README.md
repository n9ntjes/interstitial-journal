# Interstitial Journal — monorepo (`ij/`)

Three services live here:

| Path | Role | Stack |
|---|---|---|
| `api/` | Page-based backend API, served by local Apache at `https://localhost:8888/ij/api/` | PHP 8 + MySQL |
| `web-app/` | Information & control surface (stats, settings, booting the execution layer) | React + TypeScript (Vite) |
| `tauri-app/` | Execution layer — system hotkeys, overlays, quick-punch | Tauri 2 + React + TypeScript |

The design intent: the `web-app` is the controller and reporting surface; the `tauri-app` is the persistent-but-dormant execution layer that the web-app can wake up. Punches flow back and forth between the two; both talk to the same PHP API.

See `SPEC.md` for the full product spec (currently reflects the earlier macOS/Swift incarnation — being rewritten for this stack).

## Running locally

### API

Served by the local Apache vhost. Smoke-test:

```sh
curl -sSk https://localhost:8888/ij/api/health.php
```

### Web-app

```sh
cd web-app
npm install      # already run once during bootstrap
npm run dev      # http://localhost:5173
```

The web-app probes `VITE_API_BASE` (defaults to `https://localhost:8888/ij/api`) for `/health.php` on load. Override with `.env.local` if your Apache runs elsewhere.

### Tauri-app

Requires Rust. Install via <https://rustup.rs>.

```sh
cd tauri-app
npm install      # already run once during bootstrap
npm run tauri dev
```

The tauri-app's Vite dev server runs on `http://localhost:1420` (configured in `tauri-app/vite.config.ts`).

## Layout

```
ij/
├── SPEC.md                 # product spec
├── README.md               # this file
├── api/                    # PHP backend (page-based routes)
│   ├── index.php           # 404 fallback
│   └── health.php          # GET /ij/api/health.php
├── web-app/                # React+TS controller surface
│   └── src/App.tsx
└── tauri-app/              # Tauri 2 execution layer
    ├── src/App.tsx         # frontend
    └── src-tauri/          # Rust side
        ├── Cargo.toml
        ├── tauri.conf.json
        └── src/lib.rs      # `greet` command
```
