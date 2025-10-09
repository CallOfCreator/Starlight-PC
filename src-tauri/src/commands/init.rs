use crate::finder;
use log::info;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[tauri::command]
pub async fn init_app(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    // Create directory structure
    for dir in ["profiles", "global/amongus_base", "global/userdata_base"] {
        fs::create_dir_all(data_dir.join(dir)).map_err(|e| e.to_string())?;
    }

    let store = app
        .store("registry.json")
        .map_err(|e| format!("Failed to load store: {}", e))?;

    if store.get("initialized").is_none() {
        let amongus_path = finder::get_among_us_paths()
            .first()
            .map(|p| p.to_string_lossy().to_string());

        store.set("initialized", json!(true));
        store.set("profiles", json!([]));
        store.set("active_profile", json!(null));
        store.set("amongus_path", json!(amongus_path));
        store.set("base_game_setup", json!(false));

        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;

        info!("Initialized app at: {}", data_dir.display());
        Ok(format!("Initialized. Among Us: {:?}", amongus_path))
    } else {
        Ok("Already initialized".to_string())
    }
}

#[tauri::command]
pub async fn setup_base_game(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let store = app
        .store("registry.json")
        .map_err(|e| format!("Failed to load store: {}", e))?;

    if store
        .get("base_game_setup")
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Err("Base game already set up".into());
    }

    let amongus_path = store
        .get("amongus_path")
        .and_then(|v| v.as_str().map(String::from))
        .ok_or("Among Us path not found in registry")?;

    let source = PathBuf::from(&amongus_path);
    if !source.exists() {
        return Err(format!("Among Us not found at: {}", amongus_path));
    }

    // Extract game version
    let version = extract_game_version(&source)?;
    info!("Detected Among Us version: {}", version);

    // Create versioned base directory
    let base_dir = data_dir.join("global").join(format!("amongus_base/{}", version));
    copy_dir_recursive(&source, &base_dir)?;

    store.set("base_game_setup", json!(true));
    store.set("game_version", json!(version.clone()));
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    info!("Base game v{} copied to {}", version, base_dir.display());
    Ok(format!("Base game v{} setup complete", version))
}

#[tauri::command]
pub fn get_among_us_path_from_store(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = app
        .store("registry.json")
        .map_err(|e| format!("Failed to load store: {}", e))?;

    Ok(store
        .get("amongus_path")
        .and_then(|v| v.as_str().map(String::from)))
}

#[tauri::command]
pub fn update_among_us_path(app: tauri::AppHandle, new_path: String) -> Result<(), String> {
    if !PathBuf::from(&new_path).exists() {
        return Err(format!("Path does not exist: {}", new_path));
    }

    let store = app
        .store("registry.json")
        .map_err(|e| format!("Failed to load store: {}", e))?;

    store.set("amongus_path", json!(new_path));
    store.set("base_game_setup", json!(false));
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

fn extract_game_version(game_path: &PathBuf) -> Result<String, String> {
    // Path to globalgamemanagers file
    let file_path = game_path
        .join("Among Us_Data")
        .join("globalgamemanagers");

    if !file_path.exists() {
        return Err(format!(
            "globalgamemanagers file not found at: {}",
            file_path.display()
        ));
    }

    let bytes = fs::read(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Find the pattern "public.app-category.games"
    let pattern = b"public.app-category.games";
    let index = find_pattern(&bytes, pattern)
        .ok_or("Version pattern not found in globalgamemanagers")?
        + pattern.len();

    // Find the version pattern "20" after the first pattern
    let remaining = &bytes[index..];
    let version_pattern = b"20";
    let version_index = find_pattern(remaining, version_pattern)
        .ok_or("Version number not found in globalgamemanagers")?;

    let version_start = index + version_index;

    // Extract version string (read until null byte)
    let version_bytes: Vec<u8> = bytes[version_start..]
        .iter()
        .take_while(|&&b| b != 0)
        .copied()
        .collect();

    String::from_utf8(version_bytes)
        .map_err(|e| format!("Failed to parse version string: {}", e))
}

fn find_pattern(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn copy_dir_recursive(source: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;

    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let file_name = entry.file_name();
        let target = dest.join(&file_name);

        // Skip hidden files and directories
        if file_name.to_string_lossy().starts_with('.') {
            continue;
        }

        if path.is_dir() {
            copy_dir_recursive(&path, &target)?;
        } else {
            fs::copy(&path, &target)
                .map_err(|e| format!("Failed to copy {}: {}", path.display(), e))?;
        }
    }

    Ok(())
}