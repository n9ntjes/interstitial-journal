//! Live-feed overlay: non–key `NSPanel` so the feed stays on top without stealing focus.

use tauri::{AppHandle, Manager, Wry};
use tauri_nspanel::{CollectionBehavior, ManagerExt, StyleMask, WebviewWindowExt};

/// `NSPopUpMenuWindowLevel` — above normal windows and fullscreen presentation.
const NS_POP_UP_MENU_WINDOW_LEVEL: i64 = 101;

tauri_nspanel::tauri_panel! {
    LiveFeedPanel {
        config: {
            can_become_key_window: false,
            is_floating_panel: true,
        }
    }
}

/// Swizzle the Tauri window to [`LiveFeedPanel`] and apply overlay configuration.
pub fn init_live_feed_panel(app: &AppHandle<Wry>, label: &str) -> tauri::Result<()> {
    let Some(win) = app.get_webview_window(label) else {
        return Ok(());
    };
    let _ = win.to_panel::<LiveFeedPanel>()?;

    let Ok(panel) = app.get_webview_panel(label) else {
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
    panel.order_front_regardless();
    Ok(())
}
