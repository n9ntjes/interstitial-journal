//! Primary monitor capture via **[`xcap`]** (0.9+), matching the stack behind
//! `tauri-plugin-screenshots` but avoiding **xcap 0.3**’s macOS bug: it queried
//! `NSScreen` from inside `Monitor::all()` while we run capture on a
//! `spawn_blocking` thread — AppKit is main-thread-only and will hard-crash the
//! process. Newer xcap only touches CoreGraphics during enumeration.
//!
//! Still needs `NSScreenCaptureUsageDescription` in `Info.plist`.

use image::codecs::png::PngEncoder;
use image::{ExtendedColorType, ImageEncoder};
use xcap::Monitor;

pub fn capture_primary_screen_png() -> Result<Vec<u8>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    if monitors.is_empty() {
        return Err("no displays detected".into());
    }
    let monitor = monitors
        .iter()
        .find(|m| matches!(m.is_primary(), Ok(true)))
        .unwrap_or(&monitors[0]);

    let img = monitor.capture_image().map_err(|e| e.to_string())?;

    let mut bytes = Vec::new();
    PngEncoder::new(&mut bytes)
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;
    Ok(bytes)
}
