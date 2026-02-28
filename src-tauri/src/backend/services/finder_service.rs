use crate::backend::error::{AppError, AppResult};
use log::{debug, info, warn};
use std::path::{Path, PathBuf};

#[cfg(target_os = "windows")]
use winreg::{RegKey, enums::*};

const AMONG_US_EXE: &str = "Among Us.exe";
const EPIC_FOLDER: &str = "Among Us_Data/StreamingAssets/aa/EGS";
const XBOX_FOLDER: &str = "Among Us_Data/StreamingAssets/aa/Win10";

fn verify_among_us_directory(path: &Path) -> bool {
    path.is_dir() && path.join(AMONG_US_EXE).is_file()
}

#[cfg(target_os = "windows")]
fn is_windows_apps_path(path: &Path) -> bool {
    path.to_string_lossy()
        .to_lowercase()
        .contains("windowsapps")
}

fn is_epic_installation(path: &Path) -> bool {
    path.join(EPIC_FOLDER).is_dir()
}

fn is_xbox_installation(path: &Path) -> bool {
    path.join(XBOX_FOLDER).is_dir()
}

#[cfg(target_os = "windows")]
fn parse_registry_icon_value(raw_value: &str) -> Option<PathBuf> {
    let path = raw_value
        .split(',')
        .next()?
        .trim()
        .trim_matches(|c| c == '"' || c == '\'')
        .replace(';', "\\");

    if path.is_empty() {
        return None;
    }

    PathBuf::from(path).parent().map(|p| p.to_path_buf())
}

#[cfg(target_os = "windows")]
fn find_among_us_from_registry() -> Option<PathBuf> {
    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);

    for key_name in ["AmongUs", "amongus"] {
        let directory = hkcr
            .open_subkey(key_name)
            .ok()
            .and_then(|key| key.open_subkey("DefaultIcon").ok())
            .and_then(|icon_key| icon_key.get_value::<String, _>("").ok())
            .and_then(|raw_value| parse_registry_icon_value(&raw_value))
            .filter(|directory| verify_among_us_directory(directory));

        if let Some(dir) = directory {
            if is_windows_apps_path(&dir) {
                info!(
                    "Skipping WindowsApps path (Xbox installation): {}",
                    dir.display()
                );
                continue;
            }
            info!("Found Among Us via registry: {}", dir.display());
            return Some(dir);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn find_among_us_linux_paths() -> Vec<PathBuf> {
    let mut detected_paths = Vec::new();
    if let Some(home) = home::home_dir() {
        let steam_apps = [
            ".local/share/Steam/steamapps/common/Among Us",
            ".steam/steam/steamapps/common/Among Us",
            ".var/app/com.valvesoftware.Steam/data/Steam/steamapps/common/Among Us",
        ];

        for sub_path in steam_apps {
            let full_path = home.join(sub_path);
            if verify_among_us_directory(&full_path) {
                info!("Found Among Us at: {}", full_path.display());
                detected_paths.push(full_path);
            }
        }
    }
    detected_paths
}

pub fn detect_among_us_installation() -> AppResult<Option<String>> {
    let paths = get_among_us_paths();
    Ok(paths.first().map(|p| p.to_string_lossy().to_string()))
}

pub fn get_among_us_paths() -> Vec<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        if let Some(path) = find_among_us_from_registry() {
            return vec![path];
        }
    }

    #[cfg(target_os = "linux")]
    {
        let paths = find_among_us_linux_paths();
        if !paths.is_empty() {
            return paths;
        }
    }

    info!("Among Us installation not detected");
    Vec::new()
}

pub fn detect_game_store(path: &str) -> AppResult<String> {
    let path = PathBuf::from(path);

    if !verify_among_us_directory(&path) {
        warn!("Invalid Among Us installation directory: {:?}", path);
        return Err(AppError::platform(
            "Invalid Among Us installation directory",
        ));
    }

    let platform = if is_epic_installation(&path) {
        "epic"
    } else if is_xbox_installation(&path) {
        "xbox"
    } else {
        "steam"
    };

    debug!("Detected platform '{}' for path: {:?}", platform, path);
    Ok(platform.to_string())
}

#[cfg(test)]
mod tests {
    use super::detect_game_store;

    #[test]
    fn detect_store_rejects_invalid_path() {
        let result = detect_game_store("/definitely/not/a/real/amoungus/path");
        assert!(result.is_err());
    }
}
