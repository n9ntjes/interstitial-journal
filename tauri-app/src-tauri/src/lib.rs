use std::thread;

use base64::Engine;
use tauri::{
    ipc::Response,
    menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, Runtime, WindowEvent, Wry,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(target_os = "macos")]
use tauri_nspanel::ManagerExt;

mod capture;
mod device_auth;
mod live_feed;

#[cfg(target_os = "macos")]
mod macos;

const LIVE_FEED_MENU_ID: &str = "toggle-live-feed";
const POPUP_THEME_PREFIX: &str = "popup-theme::";
const LIVE_FEED_THEME_PREFIX: &str = "live-feed-theme::";
const PREFS_CHANGED_EVENT: &str = "desktop-prefs:changed";

/// Tray menu check-item handles. `CheckMenuItem` toggles state on click, so we re-read
/// after the platform has updated it; for the radio-style theme groups we force-set
/// each sibling so only one stays checked.
struct IjTrayState {
    live_feed_item: CheckMenuItem<Wry>,
    popup_theme_items: Vec<(String, CheckMenuItem<Wry>)>,
    live_feed_theme_items: Vec<(String, CheckMenuItem<Wry>)>,
}

pub(crate) const QUICK_PUNCH_WINDOW: &str = "quick-punch";
const SHOW_EVENT: &str = "quick-punch:show";
const SCREENSHOT_EVENT: &str = "screenshot:capture";
const SCREENSHOT_ERROR_EVENT: &str = "screenshot:error";

/// `NSPanel` / webview calls must run on the main thread. Global shortcut and
/// `tokio` worker threads are not main — dispatch through the event loop.
fn run_on_main_sync<R: Send + 'static, RT: Runtime>(
    app: &AppHandle<RT>,
    f: impl FnOnce() -> R + Send + 'static,
) -> Result<R, String> {
    #[cfg(target_os = "macos")]
    if objc2::MainThreadMarker::new().is_some() {
        return Ok(f());
    }

    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let _ = tx.send(f());
    })
    .map_err(|e| e.to_string())?;
    rx.recv()
        .map_err(|_| "main thread channel closed".to_string())
}

#[cfg(target_os = "macos")]
fn is_quick_punch_visible<RT: Runtime>(app: &AppHandle<RT>) -> bool {
    app.get_webview_panel(QUICK_PUNCH_WINDOW)
        .map(|p| p.is_visible())
        .unwrap_or(false)
}

#[cfg(not(target_os = "macos"))]
fn is_quick_punch_visible<RT: Runtime>(app: &AppHandle<RT>) -> bool {
    app.get_webview_window(QUICK_PUNCH_WINDOW)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn hide_quick_punch_impl<RT: Runtime>(app: &AppHandle<RT>) {
    if let Ok(panel) = app.get_webview_panel(QUICK_PUNCH_WINDOW) {
        panel.hide();
    }
}

#[cfg(not(target_os = "macos"))]
fn hide_quick_punch_impl<RT: Runtime>(app: &AppHandle<RT>) {
    if let Some(win) = app.get_webview_window(QUICK_PUNCH_WINDOW) {
        let _ = win.hide();
    }
}

/// Horizontally centered, anchored above the bottom of the primary monitor (Honest Glass
/// “bottom sheet” feel for the quick-punch strip).
fn position_quick_punch_window<R: Runtime>(win: &tauri::WebviewWindow<R>) {
    // Bottom inset from the physical screen edge to the window's bottom.
    const MARGIN_BOTTOM: i32 = 80;

    let Ok(size) = win.outer_size() else {
        let _ = win.center();
        return;
    };
    let Ok(Some(monitor)) = win.primary_monitor() else {
        let _ = win.center();
        return;
    };
    let mon_size = monitor.size();
    let mon_pos = monitor.position();
    let x = mon_pos.x + (mon_size.width as i32 - size.width as i32) / 2;
    let y = mon_pos.y + mon_size.height as i32 - size.height as i32 - MARGIN_BOTTOM;
    if win.set_position(PhysicalPosition::new(x, y)).is_err() {
        let _ = win.center();
    }
}

#[cfg(target_os = "macos")]
fn show_quick_punch_window<RT: Runtime>(app: &AppHandle<RT>) {
    if let Some(win) = app.get_webview_window(QUICK_PUNCH_WINDOW) {
        position_quick_punch_window(&win);
    }
    if let Ok(panel) = app.get_webview_panel(QUICK_PUNCH_WINDOW) {
        // orderFrontRegardless + makeKeyWindow — never NSApp.activate. The nonactivating
        // style mask set at init makes this safe from within another app's fullscreen Space.
        panel.show_and_make_key();
    }
}

#[cfg(not(target_os = "macos"))]
fn show_quick_punch_window<RT: Runtime>(app: &AppHandle<RT>) {
    if let Some(win) = app.get_webview_window(QUICK_PUNCH_WINDOW) {
        position_quick_punch_window(&win);
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
fn hide_quick_punch(app: AppHandle) {
    let app_c = app.clone();
    let _ = run_on_main_sync(&app, move || hide_quick_punch_impl(&app_c));
}

#[tauri::command]
fn get_desktop_prefs(app: AppHandle) -> live_feed::DesktopPrefs {
    live_feed::load_prefs(&app)
}

#[tauri::command]
fn get_device_auth(
    state: tauri::State<device_auth::DeviceAuthState>,
) -> Option<device_auth::DeviceAuthDto> {
    state.get()
}

#[tauri::command]
fn clear_device_auth(
    app: AppHandle,
    state: tauri::State<device_auth::DeviceAuthState>,
) -> Result<(), String> {
    state.clear()?;
    let _ = app.emit(
        "device-auth:changed",
        Option::<device_auth::DeviceAuthDto>::None,
    );
    Ok(())
}

fn open_quick_punch_session<RT: Runtime>(app: &AppHandle<RT>) {
    show_quick_punch_window(app);
    let _ = app.emit(SHOW_EVENT, ());
}

fn toggle_quick_punch<RT: Runtime>(app: &AppHandle<RT>) {
    if is_quick_punch_visible(app) {
        hide_quick_punch_impl(app);
    } else {
        open_quick_punch_session(app);
    }
}

/// Run display capture without hiding the quick-punch window (keeps UI stable; the
/// pill may appear in the bitmap — acceptable trade-off vs flicker).
fn capture_screen_png() -> Result<Vec<u8>, String> {
    capture::capture_primary_screen_png()
}

#[tauri::command]
async fn capture_screenshot(_app: AppHandle) -> Result<Response, String> {
    tokio::task::spawn_blocking(capture_screen_png)
        .await
        .map_err(|e| format!("capture join: {e}"))?
        .map(Response::new)
}

/// Global-hotkey path: capture off the hotkey thread, then publish on main.
fn handle_screenshot_hotkey<R: Runtime>(app: &AppHandle<R>) {
    let app = app.clone();
    thread::spawn(move || {
        let bytes_result = capture_screen_png();

        let _ = run_on_main_sync(&app, {
            let app = app.clone();
            move || {
                if !is_quick_punch_visible(&app) {
                    open_quick_punch_session(&app);
                }
                match bytes_result {
                    Ok(bytes) => {
                        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                        let _ = app.emit_to(
                            tauri::EventTarget::webview_window(QUICK_PUNCH_WINDOW),
                            SCREENSHOT_EVENT,
                            b64,
                        );
                    }
                    Err(e) => {
                        let _ = app.emit_to(
                            tauri::EventTarget::webview_window(QUICK_PUNCH_WINDOW),
                            SCREENSHOT_ERROR_EVENT,
                            e,
                        );
                    }
                }
            }
        });
    });
}

#[cfg(target_os = "macos")]
fn screenshot_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyS)
}

#[cfg(not(target_os = "macos"))]
fn screenshot_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyS)
}

/// Radio-group toggle: update prefs on disk, force-set the checkmarks for this scope
/// (the platform already toggled the clicked item; we make sure siblings clear),
/// then broadcast so the relevant webview re-applies its `data-theme` attribute.
fn apply_theme_change(app: &AppHandle, for_popup: bool, theme_id: &str) {
    let mut prefs = live_feed::load_prefs(app);
    if for_popup {
        if prefs.popup_theme == theme_id {
            // No-op click on an already-selected radio item — platform may have toggled
            // the check off, so still re-assert state below and skip the save.
        }
        prefs.popup_theme = theme_id.to_string();
    } else {
        prefs.live_feed_theme = theme_id.to_string();
    }
    let _ = live_feed::save_prefs(app, &prefs);

    let state = app.state::<IjTrayState>();
    let items = if for_popup {
        &state.popup_theme_items
    } else {
        &state.live_feed_theme_items
    };
    for (id, item) in items.iter() {
        let _ = item.set_checked(id.as_str() == theme_id);
    }

    let _ = app.emit(PREFS_CHANGED_EVENT, &prefs);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }
                    if shortcut.matches(Modifiers::ALT, Code::Space) {
                        let app = app.clone();
                        thread::spawn(move || {
                            let app_c = app.clone();
                            let _ = run_on_main_sync(&app, move || toggle_quick_punch(&app_c));
                        });
                    } else if shortcut == &screenshot_shortcut() {
                        handle_screenshot_hotkey(app);
                    }
                })
                .build(),
        );

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .setup(|app| {
            app.manage(device_auth::load_or_pair(&app.handle()));

            // Handle ij://pair?token=…&api_base=…&user_email=… deep links.
            // Covers both cold-start (app opened by the URL) and already-running cases.
            let dl_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let state = dl_handle.state::<device_auth::DeviceAuthState>();
                for url in event.urls() {
                    match device_auth::pair_from_url(url.as_str(), &state) {
                        Ok(dto) => {
                            let _ = dl_handle.emit("device-auth:changed", Some(dto));
                        }
                        Err(e) => {
                            eprintln!("[deep-link] pairing failed: {e}");
                        }
                    }
                }
            });

            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                let handle = app.handle().clone();
                let _ = macos::init_quick_punch_panel(&handle);
            }

            if let Some(win) = app.get_webview_window(QUICK_PUNCH_WINDOW) {
                let win_for_event = win.clone();
                win.on_window_event(move |event| {
                    if matches!(event, WindowEvent::Focused(false)) {
                        let _ = win_for_event.hide();
                    }
                });
            }

            let prefs = live_feed::load_prefs(&app.handle());

            let new_punch =
                MenuItem::with_id(app, "new-punch", "New Punch\t⌥Space", true, None::<&str>)?;
            let live_feed_item = CheckMenuItem::with_id(
                app,
                LIVE_FEED_MENU_ID,
                "Show Live Feed",
                true,
                prefs.live_feed_enabled,
                None::<&str>,
            )?;

            let popup_theme_items = build_theme_items(app, POPUP_THEME_PREFIX, &prefs.popup_theme)?;
            let live_feed_theme_items =
                build_theme_items(app, LIVE_FEED_THEME_PREFIX, &prefs.live_feed_theme)?;
            let popup_theme_submenu = build_theme_submenu(app, "Pop-up Theme", &popup_theme_items)?;
            let live_feed_theme_submenu =
                build_theme_submenu(app, "Live Feed Theme", &live_feed_theme_items)?;

            let menu_sep_1 = PredefinedMenuItem::separator(app)?;
            let menu_sep_2 = PredefinedMenuItem::separator(app)?;
            let quit =
                MenuItem::with_id(app, "quit", "Quit Interstitial Journal", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &new_punch,
                    &live_feed_item,
                    &menu_sep_1,
                    &popup_theme_submenu,
                    &live_feed_theme_submenu,
                    &menu_sep_2,
                    &quit,
                ],
            )?;

            app.manage(IjTrayState {
                live_feed_item: live_feed_item.clone(),
                popup_theme_items,
                live_feed_theme_items,
            });

            let handle = app.handle().clone();
            if prefs.live_feed_enabled {
                let h = handle.clone();
                let _ = live_feed::open_windows(&h);
            }

            let tray_image =
                tauri::image::Image::from_bytes(include_bytes!("../icons/white-petals-icon.png"))?;
            let tray_builder = TrayIconBuilder::with_id("ij-tray")
                .icon(tray_image)
                .tooltip("Interstitial Journal")
                .menu(&menu);
            #[cfg(target_os = "macos")]
            let tray_builder = tray_builder.icon_as_template(true);
            let _tray = tray_builder
                .on_menu_event(|app, event| {
                    let id = event.id.as_ref();
                    match id {
                        "new-punch" => {
                            let app_c = app.clone();
                            let _ = run_on_main_sync(&app, move || toggle_quick_punch(&app_c));
                        }
                        LIVE_FEED_MENU_ID => {
                            let enabled = app
                                .state::<IjTrayState>()
                                .live_feed_item
                                .is_checked()
                                .unwrap_or(false);
                            // Load-modify-save so we don't clobber the theme fields.
                            let mut p = live_feed::load_prefs(app);
                            p.live_feed_enabled = enabled;
                            let _ = live_feed::save_prefs(app, &p);
                            let _ = live_feed::apply_enabled(app, enabled);
                        }
                        "quit" => app.exit(0),
                        other => {
                            if let Some(theme_id) = other.strip_prefix(POPUP_THEME_PREFIX) {
                                apply_theme_change(app, true, theme_id);
                            } else if let Some(theme_id) =
                                other.strip_prefix(LIVE_FEED_THEME_PREFIX)
                            {
                                apply_theme_change(app, false, theme_id);
                            }
                        }
                    }
                })
                .build(app)?;

            let alt_space = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            app.global_shortcut().register(alt_space)?;
            app.global_shortcut().register(screenshot_shortcut())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_quick_punch,
            capture_screenshot,
            get_desktop_prefs,
            get_device_auth,
            clear_device_auth
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_theme_items<M: Manager<Wry>>(
    manager: &M,
    prefix: &str,
    selected: &str,
) -> tauri::Result<Vec<(String, CheckMenuItem<Wry>)>> {
    let mut items = Vec::with_capacity(live_feed::THEME_IDS.len());
    for id in live_feed::THEME_IDS {
        let item = CheckMenuItem::with_id(
            manager,
            format!("{prefix}{id}"),
            live_feed::theme_label(id),
            true,
            *id == selected,
            None::<&str>,
        )?;
        items.push(((*id).to_string(), item));
    }
    Ok(items)
}

fn build_theme_submenu<M: Manager<Wry>>(
    manager: &M,
    title: &str,
    items: &[(String, CheckMenuItem<Wry>)],
) -> tauri::Result<Submenu<Wry>> {
    let refs: Vec<&dyn IsMenuItem<Wry>> = items
        .iter()
        .map(|(_, i)| i as &dyn IsMenuItem<Wry>)
        .collect();

    #[cfg(target_os = "macos")]
    {
        let icon =
            tauri::image::Image::from_bytes(include_bytes!("../icons/white-petals-icon.png"))?;
        let menu = Submenu::new_with_icon(manager, title, true, Some(icon))?;
        menu.append_items(&refs)?;
        Ok(menu)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Submenu::with_items(manager, title, true, &refs)
    }
}
