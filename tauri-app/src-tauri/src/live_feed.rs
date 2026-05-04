use serde::{Deserialize, Serialize};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

const PREFS_FILE: &str = "desktop_prefs.json";
/// Single overlay window label (user drags it to another display if they want it there).
pub(crate) const LIVE_FEED_LABEL: &str = "live-feed";
/// Legacy per-monitor labels — closed on startup so only [`LIVE_FEED_LABEL`] remains.
const LEGACY_LABEL_PREFIX: &str = "live-feed-";

/// Themes are defined in CSS (`src/themes.css`); this list is the source of truth for the tray
/// menu, preference normalization, and the front-end `data-theme` attribute.
pub const THEME_IDS: &[&str] = &[
    "glass-dark",
    "glass-light",
    "mono-terminal",
    "paper",
    "neon",
];
pub const DEFAULT_THEME: &str = "glass-dark";

pub fn theme_label(id: &str) -> &'static str {
    match id {
        "glass-dark" => "Honest Glass — Dark",
        "glass-light" => "Honest Glass — Light",
        "mono-terminal" => "Mono Terminal",
        "paper" => "Paper",
        "neon" => "Neon",
        _ => "Unknown",
    }
}

fn normalize_theme(id: &str) -> String {
    if THEME_IDS.iter().any(|t| *t == id) {
        id.to_string()
    } else {
        DEFAULT_THEME.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopPrefs {
    #[serde(default = "default_live_feed_enabled")]
    pub live_feed_enabled: bool,
    #[serde(default = "default_theme")]
    pub popup_theme: String,
    #[serde(default = "default_theme")]
    pub live_feed_theme: String,
}

fn default_live_feed_enabled() -> bool {
    true
}

fn default_theme() -> String {
    DEFAULT_THEME.to_string()
}

impl Default for DesktopPrefs {
    fn default() -> Self {
        Self {
            live_feed_enabled: default_live_feed_enabled(),
            popup_theme: default_theme(),
            live_feed_theme: default_theme(),
        }
    }
}

fn prefs_path(app: &AppHandle<Wry>) -> Result<std::path::PathBuf, String> {
    app.path()
        .resolve(PREFS_FILE, BaseDirectory::AppConfig)
        .map_err(|e| e.to_string())
}

pub fn load_prefs(app: &AppHandle<Wry>) -> DesktopPrefs {
    let Ok(path) = prefs_path(app) else {
        return DesktopPrefs::default();
    };
    let mut prefs: DesktopPrefs = std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    // Forget themes that were removed between versions — fall back to the default
    // rather than leaving the UI in an unstyled state.
    prefs.popup_theme = normalize_theme(&prefs.popup_theme);
    prefs.live_feed_theme = normalize_theme(&prefs.live_feed_theme);
    prefs
}

pub fn save_prefs(app: &AppHandle<Wry>, prefs: &DesktopPrefs) -> Result<(), String> {
    let path = prefs_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

fn is_live_feed_window_label(label: &str) -> bool {
    label == LIVE_FEED_LABEL || label.starts_with(LEGACY_LABEL_PREFIX)
}

/// Close the live feed webview (and any legacy `live-feed-*` copies) plus panel entry on macOS.
pub fn close_windows(app: &AppHandle<Wry>) {
    let labels: Vec<String> = app
        .webview_windows()
        .into_keys()
        .filter(|l| is_live_feed_window_label(l))
        .collect();

    for label in labels {
        #[cfg(target_os = "macos")]
        {
            use tauri_nspanel::ManagerExt;
            let _ = app.remove_webview_panel(&label);
        }
        if let Some(w) = app.get_webview_window(&label) {
            let _ = w.close();
        }
    }
}

/// One transparent always-on-top window. Opens on the **primary** display (or first available)
/// with a 32 px inset; the user drags it onto another monitor if they want it there.
pub fn open_windows(app: &AppHandle<Wry>) -> Result<(), String> {
    close_windows(app);

    let monitors = app
        .available_monitors()
        .map_err(|e| format!("monitors: {e}"))?;
    let Some(first) = monitors.first() else {
        return Err("no monitors".into());
    };
    let mon = app
        .primary_monitor()
        .map_err(|e| format!("monitors: {e}"))?
        .unwrap_or_else(|| first.clone());

    let pos = mon.position();
    let x = pos.x + 32;
    let y = pos.y + 32;

    let win = WebviewWindowBuilder::new(app, LIVE_FEED_LABEL, WebviewUrl::App("index.html".into()))
        .title("Interstitial Journal — Live Feed")
        .inner_size(388.0, 176.0)
        .min_inner_size(320.0, 96.0)
        .max_inner_size(388.0, 240.0)
        .position(x as f64, y as f64)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .maximizable(false)
        .visible(true)
        .focused(false)
        .shadow(false)
        .accept_first_mouse(true)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let _ = crate::macos::init_live_feed_panel(app, LIVE_FEED_LABEL);
        drop(win);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = win.show();
    }

    Ok(())
}

pub fn apply_enabled(app: &AppHandle<Wry>, enabled: bool) -> Result<(), String> {
    if enabled {
        open_windows(app)?;
    } else {
        close_windows(app);
    }
    Ok(())
}
