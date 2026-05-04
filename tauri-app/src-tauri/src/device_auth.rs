use serde::{Deserialize, Serialize};
use std::{
    fs::OpenOptions,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{path::BaseDirectory, AppHandle, Manager, Wry};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

const DEVICE_FILE: &str = "device.json";
const SIDECAR_FILE: &str = "device.ij-config";
const CONFIG_VERSION: u8 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceAuthDto {
    pub token: String,
    pub api_base: String,
    pub user_email: Option<String>,
}

#[derive(Debug)]
pub struct DeviceAuthState {
    path: Option<PathBuf>,
    auth: Mutex<Option<DeviceAuthDto>>,
}

impl DeviceAuthState {
    fn new(path: Option<PathBuf>, auth: Option<DeviceAuthDto>) -> Self {
        Self {
            path,
            auth: Mutex::new(auth),
        }
    }

    pub fn get(&self) -> Option<DeviceAuthDto> {
        self.auth.lock().ok().and_then(|guard| guard.clone())
    }

    pub fn set(&self, dto: DeviceAuthDto) -> Result<(), String> {
        if let Some(path) = &self.path {
            persist_device(path, &dto)?;
        }
        if let Ok(mut guard) = self.auth.lock() {
            *guard = Some(dto);
        }
        Ok(())
    }

    pub fn clear(&self) -> Result<(), String> {
        if let Some(path) = &self.path {
            match std::fs::remove_file(path) {
                Ok(()) => {}
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        if let Ok(mut guard) = self.auth.lock() {
            *guard = None;
        }
        Ok(())
    }
}

/// Parse an `ij://pair?token=…&api_base=…&user_email=…` deep link, validate it,
/// persist to disk, and update the in-memory state.
pub fn pair_from_url(url: &str, state: &DeviceAuthState) -> Result<DeviceAuthDto, String> {
    let parsed = url::Url::parse(url).map_err(|e| format!("invalid URL: {e}"))?;

    if parsed.scheme() != "ij" {
        return Err(format!("unexpected scheme: {}", parsed.scheme()));
    }
    if parsed.host_str() != Some("pair") {
        return Err(format!("unexpected host: {:?}", parsed.host_str()));
    }

    let mut token: Option<String> = None;
    let mut api_base: Option<String> = None;
    let mut user_email: Option<String> = None;

    for (k, v) in parsed.query_pairs() {
        match k.as_ref() {
            "token"      => token      = Some(v.into_owned()),
            "api_base"   => api_base   = Some(v.into_owned()),
            "user_email" => user_email = Some(v.into_owned()),
            _ => {}
        }
    }

    let token    = token.ok_or("missing token in pair URL")?;
    let api_base = api_base.ok_or("missing api_base in pair URL")?;

    let dto = validate_parts(&token, &api_base, user_email)
        .ok_or("invalid token or api_base in pair URL")?;

    state.set(dto.clone())?;
    Ok(dto)
}

#[derive(Debug, Deserialize)]
struct SidecarConfig {
    version: u8,
    token: String,
    api_base: String,
    user_email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StoredDeviceConfig {
    version: u8,
    token: String,
    api_base: String,
    user_email: Option<String>,
    paired_at: String,
}

impl StoredDeviceConfig {
    fn to_dto(&self) -> Option<DeviceAuthDto> {
        validate_parts(&self.token, &self.api_base, self.user_email.clone())
    }
}

pub fn load_or_pair(app: &AppHandle<Wry>) -> DeviceAuthState {
    let path = device_path(app).ok();
    if let Some(path) = &path {
        if let Some(auth) = load_stored_device(path) {
            return DeviceAuthState::new(Some(path.clone()), Some(auth));
        }
    }

    let auth = path
        .as_ref()
        .and_then(|path| pair_from_sidecar(app, path).ok().flatten());

    DeviceAuthState::new(path, auth)
}

fn device_path(app: &AppHandle<Wry>) -> Result<PathBuf, String> {
    app.path()
        .resolve(DEVICE_FILE, BaseDirectory::AppConfig)
        .map_err(|e| e.to_string())
}

fn load_stored_device(path: &Path) -> Option<DeviceAuthDto> {
    let raw = std::fs::read_to_string(path).ok()?;
    let cfg = serde_json::from_str::<StoredDeviceConfig>(&raw).ok()?;
    if cfg.version != CONFIG_VERSION {
        return None;
    }
    cfg.to_dto()
}

fn pair_from_sidecar(
    app: &AppHandle<Wry>,
    device_path: &Path,
) -> Result<Option<DeviceAuthDto>, String> {
    for sidecar_path in sidecar_candidates(app) {
        if !sidecar_path.is_file() {
            continue;
        }

        let Some(dto) = parse_sidecar(&sidecar_path) else {
            continue;
        };

        persist_device(device_path, &dto)?;
        let _ = std::fs::remove_file(&sidecar_path);
        return Ok(Some(dto));
    }

    Ok(None)
}

fn parse_sidecar(path: &Path) -> Option<DeviceAuthDto> {
    let raw = std::fs::read_to_string(path).ok()?;
    let cfg = serde_json::from_str::<SidecarConfig>(&raw).ok()?;
    if cfg.version != CONFIG_VERSION {
        return None;
    }
    validate_parts(&cfg.token, &cfg.api_base, cfg.user_email)
}

fn validate_parts(
    token: &str,
    api_base: &str,
    user_email: Option<String>,
) -> Option<DeviceAuthDto> {
    if !is_hex_token(token) {
        return None;
    }

    let api_base = normalize_api_base(api_base)?;
    let user_email = user_email.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });

    Some(DeviceAuthDto {
        token: token.to_string(),
        api_base,
        user_email,
    })
}

fn is_hex_token(token: &str) -> bool {
    token.len() == 64
        && token
            .bytes()
            .all(|b| matches!(b, b'0'..=b'9' | b'a'..=b'f'))
}

fn normalize_api_base(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_end_matches('/');
    if trimmed.len() < "http://x".len() || trimmed.len() > 2048 {
        return None;
    }
    if trimmed.bytes().any(|b| b.is_ascii_whitespace()) {
        return None;
    }
    let parsed = url::Url::parse(trimmed).ok()?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return None;
    }
    Some(trimmed.to_string())
}

fn persist_device(path: &Path, dto: &DeviceAuthDto) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let cfg = StoredDeviceConfig {
        version: CONFIG_VERSION,
        token: dto.token.clone(),
        api_base: dto.api_base.clone(),
        user_email: dto.user_email.clone(),
        paired_at: now_isoish(),
    };
    let json = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;

    let mut file = open_private_file(path)?;
    file.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
    file.write_all(b"\n").map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(unix)]
fn open_private_file(path: &Path) -> Result<std::fs::File, String> {
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

    let file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .mode(0o600)
        .open(path)
        .map_err(|e| e.to_string())?;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
        .map_err(|e| e.to_string())?;
    Ok(file)
}

#[cfg(not(unix))]
fn open_private_file(path: &Path) -> Result<std::fs::File, String> {
    OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(path)
        .map_err(|e| e.to_string())
}

fn sidecar_candidates(app: &AppHandle<Wry>) -> Vec<PathBuf> {
    let mut dirs = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            push_dir_with_ancestors(&mut dirs, dir, 4);
        }
    }

    if let Some(home) = home_dir() {
        dirs.push(home.join("Downloads"));
    }

    if let Ok(cwd) = std::env::current_dir() {
        dirs.push(cwd);
    }

    if let Ok(app_config) = app.path().resolve("", BaseDirectory::AppConfig) {
        dirs.push(app_config);
    }

    dedupe_paths(dirs)
        .into_iter()
        .map(|dir| dir.join(SIDECAR_FILE))
        .collect()
}

fn push_dir_with_ancestors(dirs: &mut Vec<PathBuf>, start: &Path, count: usize) {
    let mut current = Some(start);
    for _ in 0..count {
        let Some(dir) = current else {
            break;
        };
        dirs.push(dir.to_path_buf());
        current = dir.parent();
    }
}

fn dedupe_paths(paths: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for path in paths {
        if !out.iter().any(|existing| existing == &path) {
            out.push(path);
        }
    }
    out
}

fn home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("USERPROFILE")
            .map(PathBuf::from)
            .or_else(|| {
                let drive = std::env::var_os("HOMEDRIVE")?;
                let path = std::env::var_os("HOMEPATH")?;
                Some(PathBuf::from(format!(
                    "{}{}",
                    drive.to_string_lossy(),
                    path.to_string_lossy()
                )))
            })
    }

    #[cfg(not(windows))]
    {
        std::env::var_os("HOME").map(PathBuf::from)
    }
}

fn now_isoish() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}
