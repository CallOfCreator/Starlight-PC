use crate::backend::services::profile_zip_service::{self, ProfileImportResult};
use tauri::async_runtime::spawn_blocking;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesExportZipArgs {
    pub profile_path: String,
    pub destination: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesImportZipArgs {
    pub zip_path: String,
    pub destination: String,
}

#[tauri::command]
pub async fn profiles_export_zip(args: ProfilesExportZipArgs) -> Result<(), String> {
    spawn_blocking(move || {
        profile_zip_service::export_profile_zip(args.profile_path, args.destination)
    })
    .await
    .map_err(|e| format!("Export task failed: {e}"))?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn profiles_import_zip(
    args: ProfilesImportZipArgs,
) -> Result<ProfileImportResult, String> {
    spawn_blocking(move || profile_zip_service::import_profile_zip(args.zip_path, args.destination))
        .await
        .map_err(|e| format!("Import task failed: {e}"))?
        .map_err(|e| e.to_string())
}
