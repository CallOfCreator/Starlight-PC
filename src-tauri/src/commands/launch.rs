use crate::utils::epic_api::{self, EpicApi};
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{LazyLock, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

struct TrackedGameProcess {
    child: Child,
    profile_id: Option<String>,
}

#[derive(Default)]
struct TrackedState {
    processes: Vec<TrackedGameProcess>,
    uwp_instances: Vec<Option<String>>,
}

static TRACKED_STATE: LazyLock<Mutex<TrackedState>> =
    LazyLock::new(|| Mutex::new(TrackedState::default()));

#[derive(Clone, serde::Serialize)]
pub struct GameStatePayload {
    pub running: bool,
    pub running_count: usize,
    pub profile_instance_counts: HashMap<String, usize>,
}

fn reap_process(mut child: Child) {
    if let Err(e) = child.wait() {
        warn!("Failed to reap game process: {}", e);
    }
}

fn build_state_payload(state: &TrackedState) -> GameStatePayload {
    let mut profile_instance_counts = HashMap::new();
    for tracked in &state.processes {
        if let Some(profile_id) = &tracked.profile_id {
            *profile_instance_counts
                .entry(profile_id.clone())
                .or_insert(0) += 1;
        }
    }
    for profile_id in state.uwp_instances.iter().flatten() {
        *profile_instance_counts
            .entry(profile_id.clone())
            .or_insert(0) += 1;
    }

    let running_count = state.processes.len() + state.uwp_instances.len();
    GameStatePayload {
        running: running_count > 0,
        running_count,
        profile_instance_counts,
    }
}

fn emit_state_snapshot<R: Runtime>(app: &AppHandle<R>, state: &TrackedState) {
    let payload = build_state_payload(state);
    let _ = app.emit("game-state-changed", payload);
}

/// Monitors the game process and emits state changes.
fn monitor_game_process<R: Runtime>(app: AppHandle<R>, process_id: u32) {
    std::thread::spawn(move || {
        info!("Monitoring game process state");

        loop {
            std::thread::sleep(Duration::from_millis(500));

            let Ok(mut state) = TRACKED_STATE.lock() else {
                error!("Failed to acquire game process lock");
                break;
            };

            let Some(index) = state
                .processes
                .iter()
                .position(|tracked| tracked.child.id() == process_id)
            else {
                debug!("Monitored process no longer available");
                break;
            };

            match state.processes[index].child.try_wait() {
                Ok(Some(status)) => {
                    info!("Game process exited with status: {:?}", status);
                    let tracked = state.processes.swap_remove(index);
                    reap_process(tracked.child);
                    emit_state_snapshot(&app, &state);
                    break;
                }
                Ok(None) => {}
                Err(e) => {
                    warn!("Failed to check game process state: {}", e);
                    let tracked = state.processes.swap_remove(index);
                    reap_process(tracked.child);
                    emit_state_snapshot(&app, &state);
                    break;
                }
            }
        }
    });
}

#[cfg(windows)]
fn set_dll_directory(path: &str) -> Result<(), String> {
    use windows::Win32::System::LibraryLoader::SetDllDirectoryW;
    use windows::core::PCWSTR;

    debug!("Setting DLL directory to: {}", path);
    let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe { SetDllDirectoryW(PCWSTR(wide.as_ptr())) }.map_err(|e| {
        error!("SetDllDirectory failed: {}", e);
        format!("SetDllDirectory failed: {e}")
    })
}

fn launch<R: Runtime>(
    app: AppHandle<R>,
    mut cmd: Command,
    profile_id: Option<String>,
) -> Result<(), String> {
    let process_id: u32;
    {
        let mut state = TRACKED_STATE.lock().unwrap();

        let mut i = 0;
        while i < state.processes.len() {
            match state.processes[i].child.try_wait() {
                Ok(Some(_)) => {
                    let tracked = state.processes.swap_remove(i);
                    reap_process(tracked.child);
                }
                Ok(None) => {
                    i += 1;
                }
                Err(e) => {
                    warn!("Failed to check tracked game process state: {}", e);
                    let tracked = state.processes.swap_remove(i);
                    reap_process(tracked.child);
                }
            }
        }

        info!("Launching game process");
        let child = cmd.spawn().map_err(|e| {
            error!("Failed to launch game: {}", e);
            format!("Failed to launch game: {e}")
        })?;
        process_id = child.id();
        state
            .processes
            .push(TrackedGameProcess { child, profile_id });
        emit_state_snapshot(&app, &state);
    }

    monitor_game_process(app, process_id);

    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchModdedArgs {
    game_exe: String,
    profile_id: String,
    profile_path: String,
    bepinex_dll: String,
    dotnet_dir: String,
    coreclr_path: String,
    platform: String,
}

#[tauri::command]
pub async fn launch_modded<R: Runtime>(
    app: AppHandle<R>,
    args: LaunchModdedArgs,
) -> Result<(), String> {
    info!("launch_modded: game_exe={}", args.game_exe);
    debug!(
        "launch_modded: profile_path={}, bepinex_dll={}, dotnet_dir={}, coreclr_path={}",
        args.profile_path, args.bepinex_dll, args.dotnet_dir, args.coreclr_path
    );

    let game_dir = PathBuf::from(&args.game_exe);
    let game_dir = game_dir.parent().ok_or_else(|| {
        error!("Invalid game path: {}", args.game_exe);
        "Invalid game path"
    })?;

    #[cfg(windows)]
    set_dll_directory(&args.profile_path)?;

    let mut cmd = Command::new(&args.game_exe);
    cmd.current_dir(game_dir)
        .args(["--doorstop-enabled", "true"])
        .args(["--doorstop-target-assembly", &args.bepinex_dll])
        .args(["--doorstop-clr-corlib-dir", &args.dotnet_dir])
        .args(["--doorstop-clr-runtime-coreclr-path", &args.coreclr_path]);

    if args.platform == "epic"
        && let Some(session) = epic_api::load_session()
    {
        info!("Epic session found, obtaining game token");
        let api = EpicApi::new()?;
        match api.get_game_token(&session).await {
            Ok(launch_token) => {
                debug!("Epic game token obtained successfully");
                cmd.arg(format!("-AUTH_PASSWORD={}", launch_token));
            }
            Err(e) => {
                warn!("Failed to get Epic game token: {}", e);
            }
        }
    }

    launch(app, cmd, Some(args.profile_id))
}

#[tauri::command]
pub async fn launch_vanilla<R: Runtime>(
    app: AppHandle<R>,
    game_exe: String,
    platform: String,
) -> Result<(), String> {
    info!("launch_vanilla: game_exe={}", game_exe);
    let mut cmd = Command::new(&game_exe);

    if platform == "epic"
        && let Some(session) = epic_api::load_session()
    {
        info!("Epic session found, obtaining game token");
        let api = EpicApi::new()?;
        match api.get_game_token(&session).await {
            Ok(launch_token) => {
                debug!("Epic game token obtained successfully");
                cmd.arg(format!("-AUTH_PASSWORD={}", launch_token));
            }
            Err(e) => {
                warn!("Failed to get Epic game token: {}", e);
            }
        }
    }

    launch(app, cmd, None)
}

// =============================================================================
// Xbox / Microsoft Store Commands
// =============================================================================

/// Gets the Xbox AppUserModelId for Among Us by querying installed Start Menu apps.
#[tauri::command]
pub async fn get_xbox_app_id() -> Result<String, String> {
    info!("get_xbox_app_id: Querying for Among Us in Start Apps");

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-StartApps | Where-Object { $_.Name -like '*Among Us*' }).AppId",
        ])
        .output()
        .map_err(|e| {
            error!("Failed to run PowerShell: {}", e);
            format!("Failed to run PowerShell: {e}")
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!("PowerShell command failed: {}", stderr);
        return Err(format!("PowerShell command failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let app_id = stdout.lines().next().unwrap_or("").trim().to_string();

    if app_id.is_empty() {
        error!("Among Us not found in Microsoft Store apps");
        return Err(
            "Among Us not found in Microsoft Store apps. Please ensure the game is installed."
                .to_string(),
        );
    }

    info!("Found Xbox AppUserModelId: {}", app_id);
    Ok(app_id)
}

/// Prepares an Xbox launch by copying doorstop files and modifying the config.
#[tauri::command]
pub async fn prepare_xbox_launch(game_dir: String, profile_path: String) -> Result<(), String> {
    info!(
        "prepare_xbox_launch: game_dir={}, profile_path={}",
        game_dir, profile_path
    );

    let game_dir = PathBuf::from(&game_dir);
    let profile_path = PathBuf::from(&profile_path);

    // Source files in profile root
    let src_dll = profile_path.join("winhttp.dll");
    let src_ini = profile_path.join("doorstop_config.ini");

    // Destination files in game directory
    let dst_dll = game_dir.join("winhttp.dll");
    let dst_ini = game_dir.join("doorstop_config.ini");

    // Check source files exist
    if !src_dll.exists() {
        error!("winhttp.dll not found at: {:?}", src_dll);
        return Err(
            "winhttp.dll not found in profile. Please wait for BepInEx installation to complete."
                .to_string(),
        );
    }
    if !src_ini.exists() {
        error!("doorstop_config.ini not found at: {:?}", src_ini);
        return Err(
            "doorstop_config.ini not found in profile. Please wait for BepInEx installation to complete."
                .to_string(),
        );
    }

    // Copy winhttp.dll
    debug!("Copying winhttp.dll to game directory");
    std::fs::copy(&src_dll, &dst_dll).map_err(|e| {
        error!("Failed to copy winhttp.dll: {}", e);
        format!("Failed to copy winhttp.dll: {e}")
    })?;

    // Helper to clean up on failure
    let cleanup_dll = || {
        if dst_dll.exists() {
            let _ = std::fs::remove_file(&dst_dll);
        }
    };

    // Read and modify doorstop_config.ini
    debug!("Reading doorstop_config.ini");
    let ini_content = std::fs::read_to_string(&src_ini).map_err(|e| {
        error!("Failed to read doorstop_config.ini: {}", e);
        cleanup_dll();
        format!("Failed to read doorstop_config.ini: {e}")
    })?;

    // Build absolute paths for the profile
    let target_assembly = profile_path
        .join("BepInEx")
        .join("core")
        .join("BepInEx.Unity.IL2CPP.dll");
    let coreclr_path = profile_path.join("dotnet").join("coreclr.dll");

    // Escape backslashes for INI file (Windows paths)
    let target_assembly_str = target_assembly.to_string_lossy().replace('\\', "\\\\");
    let coreclr_path_str = coreclr_path.to_string_lossy().replace('\\', "\\\\");

    // Replace the values in the INI content (skip comments starting with # or ;)
    let mut modified_content = String::new();
    for line in ini_content.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with('#')
            && !trimmed.starts_with(';')
            && trimmed.starts_with("target_assembly")
            && trimmed.contains('=')
        {
            modified_content.push_str(&format!("target_assembly = \"{}\"\n", target_assembly_str));
        } else if !trimmed.starts_with('#')
            && !trimmed.starts_with(';')
            && trimmed.starts_with("coreclr_path")
            && trimmed.contains('=')
        {
            modified_content.push_str(&format!("coreclr_path = \"{}\"\n", coreclr_path_str));
        } else {
            modified_content.push_str(line);
            modified_content.push('\n');
        }
    }

    // Write modified INI to game directory
    debug!("Writing modified doorstop_config.ini to game directory");
    std::fs::write(&dst_ini, modified_content).map_err(|e| {
        error!("Failed to write doorstop_config.ini: {}", e);
        cleanup_dll();
        format!("Failed to write doorstop_config.ini: {e}")
    })?;

    info!("Xbox launch preparation complete");
    Ok(())
}

/// Launches the Xbox/Microsoft Store version of Among Us.
/// Note: UWP app lifecycle cannot be tracked, so game state will show as "running"
/// but won't automatically reset when the game closes.
#[tauri::command]
pub async fn launch_xbox<R: Runtime>(
    app: AppHandle<R>,
    app_id: String,
    profile_id: Option<String>,
) -> Result<(), String> {
    info!("launch_xbox: app_id={}", app_id);

    // Build the shell:AppsFolder URI
    let uri = format!("shell:AppsFolder\\{}", app_id);
    debug!("Launching via: {}", uri);

    // Use 'explorer' to open the shell URI - it returns immediately after launching
    Command::new("explorer").arg(&uri).spawn().map_err(|e| {
        error!("Failed to launch Xbox game: {}", e);
        format!("Failed to launch Xbox game: {e}")
    })?;

    // Emit game state (UWP app lifecycle cannot be tracked).
    // Each launch is tracked as an active UWP instance until app restart.
    {
        let mut state = TRACKED_STATE
            .lock()
            .map_err(|_| "Failed to update game state")?;
        state.uwp_instances.push(profile_id);
        emit_state_snapshot(&app, &state);
    }
    info!("Xbox game launched (no process monitoring available for UWP apps)");

    Ok(())
}

/// Cleans up Xbox doorstop files from the game directory.
#[tauri::command]
pub async fn cleanup_xbox_files(game_dir: String) -> Result<(), String> {
    info!("cleanup_xbox_files: game_dir={}", game_dir);

    let game_dir = PathBuf::from(&game_dir);
    let dll_path = game_dir.join("winhttp.dll");
    let ini_path = game_dir.join("doorstop_config.ini");

    // Remove winhttp.dll if it exists
    if dll_path.exists() {
        debug!("Removing winhttp.dll from game directory");
        std::fs::remove_file(&dll_path).map_err(|e| {
            error!("Failed to remove winhttp.dll: {}", e);
            format!("Failed to remove winhttp.dll: {e}")
        })?;
    }

    // Remove doorstop_config.ini if it exists
    if ini_path.exists() {
        debug!("Removing doorstop_config.ini from game directory");
        std::fs::remove_file(&ini_path).map_err(|e| {
            error!("Failed to remove doorstop_config.ini: {}", e);
            format!("Failed to remove doorstop_config.ini: {e}")
        })?;
    }

    info!("Xbox cleanup complete");
    Ok(())
}
