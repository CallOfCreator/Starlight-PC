use crate::commands::epic_login_window::EpicLoginWindow;
use crate::utils::epic_api::{self, EpicApi};
use log::{info, warn};
use tauri::Emitter;

#[tauri::command]
pub fn get_epic_auth_url() -> String {
    EpicApi::get_auth_url()
}

#[tauri::command]
pub async fn epic_login_with_code(code: String) -> Result<(), String> {
    info!("Epic login with manual code");
    let code = code.trim().replace('"', "");
    let session = EpicApi::new()?.login_with_auth_code(&code).await?;
    epic_api::save_session(&session)?;
    info!("Epic login successful");
    Ok(())
}

#[tauri::command]
pub async fn epic_login_with_webview(app: tauri::AppHandle) -> Result<(), String> {
    let app_success = app.clone();
    let app_error = app.clone();
    let app_cancel = app.clone();

    EpicLoginWindow::open(
        &app,
        move || {
            let _ = app_success.emit("epic-login-success", ());
        },
        move |e| {
            let _ = app_error.emit("epic-login-error", e);
        },
        move || {
            let _ = app_cancel.emit("epic-login-cancelled", ());
        },
    )
}

#[tauri::command]
pub async fn epic_try_restore_session() -> Result<bool, String> {
    let Some(saved) = epic_api::load_session() else {
        return Ok(false);
    };

    match EpicApi::new()?.refresh_session(&saved.refresh_token).await {
        Ok(session) => {
            epic_api::save_session(&session)?;
            info!("Epic session restored");
            Ok(true)
        }
        Err(e) => {
            warn!("Failed to restore Epic session: {}", e);
            Ok(false)
        }
    }
}

#[tauri::command]
pub async fn epic_logout() -> Result<(), String> {
    info!("Epic logout");
    epic_api::clear_session()
}

#[tauri::command]
pub async fn epic_is_logged_in() -> Result<bool, String> {
    Ok(epic_api::load_session().is_some())
}
