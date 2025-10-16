use crate::{utils::finder::get_among_us_paths, utils::game::extract_game_version};
use log::info;
use serde_json::json;
use std::path::{Path, PathBuf};
use tauri::{Manager, Runtime};
use tauri_plugin_store::{Store, StoreExt};

#[tauri::command]
pub async fn init_app(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let store = app
        .store("registry.json")
        .map_err(|e| format!("Failed to load store: {}", e))?;

    let amongus_path = resolve_among_us_path(&store);
    let (amongus_path, mut store_dirty, mut response) =
        initialize_store_if_needed(&store, &data_dir, amongus_path)?;

    let (version_dirty, sync_message) =
        sync_game_version(&store, amongus_path.as_deref())?;

    store_dirty |= version_dirty;

    if store_dirty {
        store
            .save()
            .map_err(|e| format!("Failed to save store: {}", e))?;
    }

    if let Some(msg) = sync_message {
        if response.is_empty() {
            response = msg;
        } else {
            response.push_str(" | ");
            response.push_str(&msg);
        }
    }

    Ok(response)
}

fn resolve_among_us_path<R: Runtime>(store: &Store<R>) -> Option<String> {
    store
        .get("amongus_path")
        .and_then(|value| value.as_str().map(String::from))
}

fn initialize_store_if_needed<R: Runtime>(
    store: &Store<R>,
    data_dir: &Path,
    mut path: Option<String>,
) -> Result<(Option<String>, bool, String), String> {
    if store.get("initialized").is_some() {
        return Ok((path, false, "Already initialized".to_string()));
    }

    if path.is_none() {
        path = get_among_us_paths()
            .first()
            .map(|p| p.to_string_lossy().to_string());
    }

    store.set("initialized", json!(true));
    store.set("profiles", json!([]));
    store.set("active_profile", json!(null));
    store.set("amongus_path", json!(path.clone()));
    store.set("game_version", json!(null));

    info!("Initialized app at: {}", data_dir.display());
    let response = format!("Initialized. Among Us: {:?}", path);

    Ok((path, true, response))
}

fn sync_game_version<R: Runtime>(
    store: &Store<R>,
    amongus_path: Option<&str>,
) -> Result<(bool, Option<String>), String> {
    let stored_version = store
        .get("game_version")
        .and_then(|v| v.as_str().map(String::from));

    let current_version = if let Some(path) = amongus_path {
        match extract_game_version(Path::new(path)) {
            Ok(ver) => Some(ver),
            Err(e) => {
                info!("Failed to extract game version: {}", e);
                None
            }
        }
    } else {
        None
    };

    if stored_version != current_version {
        store.set("game_version", json!(current_version.clone()));
        let msg = format!(
            "Game version updated from {:?} to {:?}",
            stored_version, current_version
        );
        info!("{}", msg);
        Ok((true, Some(msg)))
    } else {
        Ok((false, None))
    }
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
    store.set("game_version", json!(null));
    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}
