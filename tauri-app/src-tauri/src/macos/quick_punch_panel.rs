//! `quick-punch` is class-swizzled to a custom `NSPanel` via `tauri-nspanel`, then configured for
//! fullscreen-Space overlay. The non-activating style mask is load-bearing: without it, key events
//! trigger `NSApp.activate`, which yanks focus out of another app's fullscreen Space and leaves the
//! panel ordered-in on our own Space (visually "behind" the fullscreen app).

use tauri::{AppHandle, Manager};
use tauri_nspanel::{CollectionBehavior, ManagerExt, StyleMask, WebviewWindowExt};

use crate::QUICK_PUNCH_WINDOW;

/// `NSPopUpMenuWindowLevel` — above menubar and fullscreen presentation.
const NS_POP_UP_MENU_WINDOW_LEVEL: i64 = 101;

tauri_nspanel::tauri_panel! {
    QuickPunchPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true,
        }
    }
}

/// Swizzle the Tauri window to [`QuickPunchPanel`] and apply overlay configuration.
pub fn init_quick_punch_panel(app: &AppHandle) -> tauri::Result<()> {
    let Some(win) = app.get_webview_window(QUICK_PUNCH_WINDOW) else {
        return Ok(());
    };
    let _ = win.to_panel::<QuickPunchPanel>()?;

    let Ok(panel) = app.get_webview_panel(QUICK_PUNCH_WINDOW) else {
        return Ok(());
    };

    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());
    panel.set_level(NS_POP_UP_MENU_WINDOW_LEVEL);
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .can_join_all_spaces()
            .full_screen_auxiliary()
            .value(),
    );
    panel.set_hides_on_deactivate(false);

    let _ = win.set_visible_on_all_workspaces(true);
    Ok(())
}
