use std::fs::{self, File};
use std::io::{Cursor, Read, Write};
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
}

const CONNECT_TIMEOUT: Duration = Duration::from_secs(30);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

fn emit_progress<R: Runtime>(app: &AppHandle<R>, stage: &str, progress: f64, message: &str) {
    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            stage: stage.to_string(),
            progress,
            message: message.to_string(),
        },
    );
}

#[tauri::command]
pub async fn download_and_extract_zip<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    destination: String,
) -> Result<(), String> {
    emit_progress(&app, "downloading", 0.0, "Starting download...");

    // Build HTTP client with timeouts
    let client = reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    // Start the download
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let total_size = response.content_length();
    let mut downloaded: u64 = 0;
    let mut bytes = Vec::new();

    // Stream the download with progress updates
    let mut stream = response.bytes_stream();
    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Error reading response: {e}"))?;
        bytes.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;

        if let Some(total) = total_size {
            let progress = (downloaded as f64 / total as f64) * 100.0;
            emit_progress(
                &app,
                "downloading",
                progress,
                &format!("Downloading... {:.1}%", progress),
            );
        }
    }

    emit_progress(&app, "extracting", 0.0, "Extracting files...");

    // Extract the ZIP file
    let cursor = Cursor::new(bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Failed to read ZIP archive: {e}"))?;

    let total_files = archive.len();
    let dest_path = Path::new(&destination);

    // Ensure destination exists
    fs::create_dir_all(dest_path)
        .map_err(|e| format!("Failed to create destination directory: {e}"))?;

    for i in 0..total_files {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {e}"))?;

        let outpath = match file.enclosed_name() {
            Some(path) => dest_path.join(path),
            None => continue, // Skip files with invalid names
        };

        // Update progress
        let progress = ((i + 1) as f64 / total_files as f64) * 100.0;
        emit_progress(
            &app,
            "extracting",
            progress,
            &format!("Extracting... {}/{}", i + 1, total_files),
        );

        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory {:?}: {e}", outpath))?;
        } else {
            // Ensure parent directory exists
            if let Some(parent) = outpath.parent()
                && !parent.exists()
            {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {e}"))?;
            }

            // Write the file
            let mut outfile = File::create(&outpath)
                .map_err(|e| format!("Failed to create file {:?}: {e}", outpath))?;

            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| format!("Failed to read from archive: {e}"))?;

            outfile
                .write_all(&buffer)
                .map_err(|e| format!("Failed to write file: {e}"))?;
        }

        // Set permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).ok();
            }
        }
    }

    emit_progress(&app, "complete", 100.0, "Installation complete!");

    Ok(())
}
