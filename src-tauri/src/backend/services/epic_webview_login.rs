use crate::backend::services::epic_auth_service::{EpicAuthService, save_session};
use log::{debug, error};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder, webview::PageLoadEvent};

type SuccessCallback = Arc<Mutex<Option<Box<dyn FnOnce() + Send>>>>;
type ErrorCallback = Arc<Mutex<Option<Box<dyn FnOnce(String) + Send>>>>;

const EPIC_LOGIN_WINDOW: &str = "epic-login";
const EPIC_REDIRECT_PATH: &str = "/id/api/redirect";
const CALLBACK_SCHEME: &str = "starlight";

const EXTRACT_CODE_JS: &str = r#"
(function() {
    if (window.__STARLIGHT_EXTRACTED__) return;
    window.__STARLIGHT_EXTRACTED__ = true;
    try {
        const bodyText = document.body.innerText;
        if (!bodyText.includes("authorizationCode")) return;
        const json = JSON.parse(bodyText);
        if (json.authorizationCode) {
            location.href = 'starlight://auth?code=' + encodeURIComponent(json.authorizationCode);
        }
    } catch(e) {
        console.error("Extraction failed", e);
    }
})();
"#;

pub fn open_epic_login_window(app: &tauri::AppHandle) -> Result<(), String> {
    let handled = Arc::new(AtomicBool::new(false));
    let auth_url: url::Url = EpicAuthService::auth_url()
        .parse()
        .map_err(|e| format!("Invalid auth URL: {e}"))?;

    let app_nav = app.clone();
    let handled_nav = handled.clone();

    let on_success_shared: SuccessCallback = Arc::new(Mutex::new(Some(Box::new({
        let app = app.clone();
        move || {
            let _ = app.emit("epic-login-success", ());
        }
    }))));
    let on_error_shared: ErrorCallback = Arc::new(Mutex::new(Some(Box::new({
        let app = app.clone();
        move |e| {
            let _ = app.emit("epic-login-error", e);
        }
    }))));
    let on_cancel_shared: SuccessCallback = Arc::new(Mutex::new(Some(Box::new({
        let app = app.clone();
        move || {
            let _ = app.emit("epic-login-cancelled", ());
        }
    }))));

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("cache");

    let window = WebviewWindowBuilder::new(app, EPIC_LOGIN_WINDOW, WebviewUrl::External(auth_url))
        .title("Login to Epic Games")
        .inner_size(500.0, 700.0)
        .data_directory(data_dir)
        .center()
        .resizable(true)
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Finished
                && let Ok(url) = webview.url()
                && url.path() == EPIC_REDIRECT_PATH
            {
                debug!("Epic redirect page loaded");
                let _ = webview.eval(EXTRACT_CODE_JS);
            }
        })
        .on_navigation(move |url| {
            if url.scheme() != CALLBACK_SCHEME {
                return true;
            }

            if handled_nav.swap(true, Ordering::SeqCst) {
                return false;
            }

            let app = app_nav.clone();
            if let Some(code) = extract_code_param(url) {
                let on_success = on_success_shared.clone();
                let on_error = on_error_shared.clone();
                tauri::async_runtime::spawn(async move {
                    let result = do_login(&code).await;
                    handle_auth_result(&app, result, on_success, on_error);
                    close_window(&app);
                });
            } else {
                let _ = app.emit("epic-login-error", "Missing authorization code".to_string());
                close_window(&app);
            }
            false
        })
        .build()
        .map_err(|e| format!("Failed to create window: {e}"))?;

    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::CloseRequested { .. })
            && !handled.load(Ordering::SeqCst)
            && let Some(on_cancel) = on_cancel_shared.lock().unwrap().take()
        {
            on_cancel();
        }
    });

    Ok(())
}

fn extract_code_param(url: &url::Url) -> Option<String> {
    url.query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.into_owned())
}

async fn do_login(code: &str) -> Result<(), String> {
    let code = code.trim().replace('"', "");
    let session = EpicAuthService::new()
        .map_err(|e| e.to_string())?
        .login_with_auth_code(&code)
        .await
        .map_err(|e| e.to_string())?;
    save_session(&session).map_err(|e| e.to_string())
}

fn handle_auth_result(
    app: &tauri::AppHandle,
    result: Result<(), String>,
    on_success: SuccessCallback,
    on_error: ErrorCallback,
) {
    match result {
        Ok(()) => {
            let _ = app.emit("epic-login-success", ());
            if let Some(success) = on_success.lock().unwrap().take() {
                success();
            }
        }
        Err(e) => {
            error!("Epic login failed: {}", e);
            let _ = app.emit("epic-login-error", e.clone());
            if let Some(err) = on_error.lock().unwrap().take() {
                err(e);
            }
        }
    }
}

fn close_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window(EPIC_LOGIN_WINDOW) {
        let _ = win.close();
    }
}
