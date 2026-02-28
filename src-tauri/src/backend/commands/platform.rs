use crate::backend::services::finder_service;
use log::info;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformDetectGameStoreArgs {
    pub path: String,
}

#[tauri::command]
pub fn platform_detect_among_us() -> Result<Option<String>, String> {
    finder_service::detect_among_us_installation().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn platform_detect_game_store(args: PlatformDetectGameStoreArgs) -> Result<String, String> {
    let platform = finder_service::detect_game_store(&args.path).map_err(|e| e.to_string())?;
    info!(
        "Game platform detected: {} for path: {}",
        platform, args.path
    );
    Ok(platform)
}
