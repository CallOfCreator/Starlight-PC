use crate::backend::services::epic_auth_service::{
    EpicAuthService, clear_session, load_session, save_session,
};
use crate::backend::services::epic_webview_login::open_epic_login_window;
use log::info;
use tauri::Emitter;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpicLoginCodeArgs {
    pub code: String,
}

#[tauri::command]
pub fn epic_auth_url() -> String {
    EpicAuthService::auth_url()
}

#[tauri::command]
pub async fn epic_login_code(args: EpicLoginCodeArgs) -> Result<(), String> {
    let session = EpicAuthService::new()
        .map_err(|e| e.to_string())?
        .login_with_auth_code(&args.code)
        .await
        .map_err(|e| e.to_string())?;
    save_session(&session).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn epic_login_webview(app: tauri::AppHandle) -> Result<(), String> {
    let _ = app.emit("epic-login-started", ());
    open_epic_login_window(&app)
}

#[tauri::command]
pub async fn epic_session_restore() -> Result<bool, String> {
    let Some(session) = load_session() else {
        return Ok(false);
    };

    let api = EpicAuthService::new().map_err(|e| e.to_string())?;
    match api.refresh_session(&session.refresh_token).await {
        Ok(refreshed) => {
            save_session(&refreshed).map_err(|e| e.to_string())?;
            Ok(true)
        }
        Err(err) => {
            info!("Epic session refresh failed, clearing session: {}", err);
            clear_session().map_err(|e| e.to_string())?;
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn epic_logout() -> Result<(), String> {
    clear_session().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn epic_is_logged_in() -> Result<bool, String> {
    Ok(load_session().is_some())
}
