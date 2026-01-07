use base64::Engine;
use log::{debug, error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

const OAUTH_HOST: &str = "account-public-service-prod03.ol.epicgames.com";
const LAUNCHER_CLIENT_ID: &str = "34a02cf8f4414e29b15921876da36f9a";
const LAUNCHER_CLIENT_SECRET: &str = "daafbccc737745039dffe53d94fc76cf";
const USER_AGENT: &str =
    "UELauncher/11.0.1-14907503+++Portal+Release-Live Windows/10.0.19041.1.256.64bit";

const CHUNK_SIZE: usize = 1200;
const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::STANDARD;

static STORAGE: OnceLock<crate::utils::storage::KeyringStorage<EpicSession>> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EpicSession {
    pub access_token: String,
    pub refresh_token: String,
    pub account_id: String,
}

#[derive(Debug, Deserialize)]
struct GameTokenResponse {
    code: String,
}

pub struct EpicApi {
    client: Client,
}

impl EpicApi {
    pub fn new() -> Result<Self, String> {
        Client::builder()
            .user_agent(USER_AGENT)
            .gzip(true)
            .build()
            .map(|client| Self { client })
            .map_err(|e| {
                error!("Failed to create HTTP client: {}", e);
                format!("Failed to create HTTP client: {e}")
            })
    }

    fn get_basic_auth() -> String {
        B64.encode(format!("{LAUNCHER_CLIENT_ID}:{LAUNCHER_CLIENT_SECRET}"))
    }

    pub fn get_auth_url() -> String {
        let redirect = format!(
            "https://www.epicgames.com/id/api/redirect?clientId={LAUNCHER_CLIENT_ID}&responseType=code"
        );
        format!(
            "https://www.epicgames.com/id/login?redirectUrl={}",
            urlencoding::encode(&redirect)
        )
    }

    pub async fn login_with_auth_code(&self, code: &str) -> Result<EpicSession, String> {
        info!("Logging in with Epic authorization code");
        self.oauth_request(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("token_type", "eg1"),
        ])
        .await
    }

    pub async fn refresh_session(&self, refresh_token: &str) -> Result<EpicSession, String> {
        debug!("Refreshing Epic session");
        self.oauth_request(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("token_type", "eg1"),
        ])
        .await
    }

    async fn oauth_request(&self, params: &[(&str, &str)]) -> Result<EpicSession, String> {
        let response = self
            .client
            .post(format!("https://{OAUTH_HOST}/account/api/oauth/token"))
            .header("Authorization", format!("Basic {}", Self::get_basic_auth()))
            .form(params)
            .send()
            .await
            .map_err(|e| {
                error!("Epic OAuth request failed: {}", e);
                format!("Request failed: {e}")
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!("Epic OAuth request failed ({}): {}", status, body);
            return Err(format!("OAuth request failed ({status}): {body}"));
        }

        response.json().await.map_err(|e| {
            error!("Failed to parse Epic OAuth response: {}", e);
            format!("Failed to parse response: {e}")
        })
    }

    pub async fn get_game_token(&self, session: &EpicSession) -> Result<String, String> {
        debug!("Requesting Epic game token");
        let response = self
            .client
            .get(format!("https://{OAUTH_HOST}/account/api/oauth/exchange"))
            .header("Authorization", format!("Bearer {}", session.access_token))
            .send()
            .await
            .map_err(|e| {
                error!("Epic game token request failed: {}", e);
                format!("Request failed: {e}")
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            error!("Failed to get Epic game token ({}): {}", status, body);
            return Err(format!("Failed to get game token ({status}): {body}"));
        }

        response
            .json::<GameTokenResponse>()
            .await
            .map(|t| {
                debug!("Epic game token obtained");
                t.code
            })
            .map_err(|e| {
                error!("Failed to parse Epic game token: {}", e);
                format!("Failed to parse token: {e}")
            })
    }
}

// --- Session storage ---

fn storage() -> &'static crate::utils::storage::KeyringStorage<EpicSession> {
    STORAGE.get_or_init(|| crate::utils::storage::KeyringStorage::new("starlight", "epic_session"))
}

pub fn save_session(session: &EpicSession) -> Result<(), String> {
    storage().save(session, CHUNK_SIZE)
}

pub fn load_session() -> Option<EpicSession> {
    storage().load()
}

pub fn clear_session() -> Result<(), String> {
    storage().clear()
}
