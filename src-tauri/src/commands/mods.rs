use futures_util::StreamExt;
use log::{debug, error, info};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(30);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

#[derive(Clone, serde::Serialize)]
pub struct ModDownloadProgress {
    pub mod_id: String,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub progress: f64,
    pub stage: String,
}

fn emit_progress<R: Runtime>(
    app: &AppHandle<R>,
    mod_id: &str,
    downloaded: u64,
    total: Option<u64>,
    stage: &str,
) {
    let progress = total
        .map(|t| downloaded as f64 / t as f64 * 100.0)
        .unwrap_or(0.0);
    if let Err(e) = app.emit(
        "mod-download-progress",
        ModDownloadProgress {
            mod_id: mod_id.to_string(),
            downloaded,
            total,
            progress,
            stage: stage.to_string(),
        },
    ) {
        error!("Failed to emit download progress: {}", e);
    }
}

/// Downloads a mod file with progress tracking and SHA-256 checksum verification
#[tauri::command]
pub async fn download_mod<R: Runtime>(
    app: AppHandle<R>,
    mod_id: String,
    mut url: String, // Changed to mut to allow replacement
    destination: String,
    expected_checksum: String,
) -> Result<(), String> {
    info!("download_mod: {} -> {}", mod_id, destination);

    // TODO: Remove bypass logic after we implement platform-specific versions
    // --- TEMPORARY WORKAROUND START ---
    let mut bypass_checksum = false;
    let target_url = "https://starlight.allofus.dev/api/v2/mods/gg.reactor.api/versions/2.5.0/file";
    let replacement_url =
        "https://github.com/NuclearPowered/Reactor/releases/download/2.5.0/Reactor.dll";

    if url == target_url {
        info!(
            "Applying workaround: replacing {} with {}",
            url, replacement_url
        );
        url = replacement_url.to_string();
        bypass_checksum = true;
    }
    // --- TEMPORARY WORKAROUND END ---

    let dest_path = Path::new(&destination);

    // Create parent directories if needed
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            error!("Failed to create directory: {}", e);
            format!("Failed to create directory: {}", e)
        })?;
    }

    // Build HTTP client with timeouts
    let client = reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| {
            error!("Failed to create HTTP client: {}", e);
            e.to_string()
        })?;

    // Start download
    emit_progress(&app, &mod_id, 0, None, "connecting");

    let response = client.get(&url).send().await.map_err(|e| {
        error!("Download request failed: {}", e);
        format!("Download failed: {}", e)
    })?;

    if !response.status().is_success() {
        let status = response.status();
        error!("Download failed with status: {}", status);
        return Err(format!("Download failed: HTTP {}", status));
    }

    let total_size = response.content_length();
    debug!("Download size: {:?} bytes", total_size);

    // Download with progress tracking and hash computation
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut buffer = Vec::new();

    emit_progress(&app, &mod_id, 0, total_size, "downloading");

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| {
            error!("Download stream error: {}", e);
            format!("Download failed: {}", e)
        })?;

        hasher.update(&chunk);
        buffer.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;

        emit_progress(&app, &mod_id, downloaded, total_size, "downloading");
    }

    // Verify checksum
    emit_progress(&app, &mod_id, downloaded, total_size, "verifying");
    let hash = hasher.finalize();
    let computed_checksum = format!("{:x}", hash);

    // TODO: Remove bypass logic after we implement platform-specific versions
    // Modified checksum logic to handle the bypass
    if !bypass_checksum && computed_checksum != expected_checksum.to_lowercase() {
        error!(
            "Checksum mismatch: expected {}, got {}",
            expected_checksum, computed_checksum
        );
        return Err(format!(
            "Checksum mismatch: expected {}, got {}",
            expected_checksum, computed_checksum
        ));
    } else if bypass_checksum {
        info!("Checksum verification bypassed for Reactor 2.5.0");
    } else {
        debug!("Checksum verified: {}", computed_checksum);
    }

    // Write file
    emit_progress(&app, &mod_id, downloaded, total_size, "writing");
    let mut file = File::create(dest_path).map_err(|e| {
        error!("Failed to create file: {}", e);
        format!("Failed to create file: {}", e)
    })?;

    file.write_all(&buffer).map_err(|e| {
        error!("Failed to write file: {}", e);
        format!("Failed to write file: {}", e)
    })?;

    emit_progress(&app, &mod_id, downloaded, total_size, "complete");
    info!("Mod download completed: {} -> {:?}", mod_id, dest_path);

    Ok(())
}
