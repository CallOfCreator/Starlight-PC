use futures_util::StreamExt;
use std::fs::{self, File};
use std::io::Write;
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
    let dest_path = Path::new(&destination);
    let temp_path = dest_path.with_extension("zip.tmp");

    // Download to temp file
    emit_progress(&app, "downloading", 0.0, "Starting download...");
    let client = reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }

    let total_size = response.content_length();
    let mut downloaded: u64 = 0;
    let mut temp_file = File::create(&temp_path).map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        temp_file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        if let Some(total) = total_size {
            let progress = downloaded as f64 / total as f64 * 100.0;
            emit_progress(
                &app,
                "downloading",
                progress,
                &format!("Downloading... {:.1}%", progress),
            );
        }
    }
    drop(temp_file);

    // Extract ZIP
    emit_progress(&app, "extracting", 0.0, "Extracting...");
    let file = File::open(&temp_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let total_files = archive.len();

    fs::create_dir_all(dest_path).map_err(|e| e.to_string())?;

    for i in 0..total_files {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let Some(name) = entry.enclosed_name() else {
            continue;
        };
        let outpath = dest_path.join(name);

        if entry.is_dir() {
            fs::create_dir_all(&outpath).ok();
        } else {
            if let Some(p) = outpath.parent() {
                fs::create_dir_all(p).ok();
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;

            #[cfg(unix)]
            if let Some(mode) = entry.unix_mode() {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&outpath, fs::Permissions::from_mode(mode)).ok();
            }
        }
        let progress = (i + 1) as f64 / total_files as f64 * 100.0;
        emit_progress(
            &app,
            "extracting",
            progress,
            &format!("Extracting... {}/{}", i + 1, total_files),
        );
    }

    let _ = fs::remove_file(&temp_path);
    emit_progress(&app, "complete", 100.0, "Installation complete!");
    Ok(())
}
