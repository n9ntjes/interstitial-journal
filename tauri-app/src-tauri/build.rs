fn main() {
    let app_manifest = tauri_build::AppManifest::new().commands(&[
        "hide_quick_punch",
        "capture_screenshot",
        "get_desktop_prefs",
        "get_device_auth",
        "clear_device_auth",
    ]);

    let attrs = tauri_build::Attributes::new().app_manifest(app_manifest);
    tauri_build::try_build(attrs).expect("failed to run tauri build script");
}
