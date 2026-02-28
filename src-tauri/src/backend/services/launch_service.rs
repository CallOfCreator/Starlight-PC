use crate::backend::error::{AppError, AppResult};
use crate::backend::services::epic_auth_service::{EpicAuthService, load_session};
use crate::backend::state::game_runtime;
use log::{debug, info, warn};
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Runtime};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchModdedArgs {
    pub game_exe: String,
    pub profile_id: String,
    #[cfg(windows)]
    pub profile_path: String,
    pub bepinex_dll: String,
    pub dotnet_dir: String,
    pub coreclr_path: String,
    pub platform: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchVanillaArgs {
    pub game_exe: String,
    pub platform: String,
}

#[cfg(windows)]
fn set_dll_directory(path: &str) -> AppResult<()> {
    use windows::Win32::System::LibraryLoader::SetDllDirectoryW;
    use windows::core::PCWSTR;

    let wide: Vec<u16> = path.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe { SetDllDirectoryW(PCWSTR(wide.as_ptr())) }
        .map_err(|e| AppError::process(format!("SetDllDirectory failed: {e}")))
}

async fn attach_epic_launch_token(cmd: &mut Command, platform: &str) -> AppResult<()> {
    if platform != "epic" {
        return Ok(());
    }

    let Some(session) = load_session() else {
        return Ok(());
    };

    info!("Epic session found, requesting game token");
    let api = EpicAuthService::new()?;
    match api.get_game_token(&session).await {
        Ok(launch_token) => {
            debug!("Epic game token obtained successfully");
            cmd.arg(format!("-AUTH_PASSWORD={}", launch_token));
        }
        Err(e) => warn!("Failed to get Epic game token: {}", e),
    }

    Ok(())
}

fn launch_process<R: Runtime>(
    app: AppHandle<R>,
    mut cmd: Command,
    profile_id: Option<String>,
) -> AppResult<()> {
    let child = cmd
        .spawn()
        .map_err(|e| AppError::process(format!("Failed to launch game: {e}")))?;
    game_runtime::register_launched_process(app, child, profile_id)
}

pub async fn launch_modded<R: Runtime>(app: AppHandle<R>, args: LaunchModdedArgs) -> AppResult<()> {
    info!("game_launch_modded: game_exe={}", args.game_exe);

    let game_dir = PathBuf::from(&args.game_exe)
        .parent()
        .ok_or_else(|| AppError::validation("Invalid game path"))?
        .to_path_buf();

    #[cfg(windows)]
    set_dll_directory(&args.profile_path)?;

    let mut cmd = Command::new(&args.game_exe);
    cmd.current_dir(game_dir)
        .args(["--doorstop-enabled", "true"])
        .args(["--doorstop-target-assembly", &args.bepinex_dll])
        .args(["--doorstop-clr-corlib-dir", &args.dotnet_dir])
        .args(["--doorstop-clr-runtime-coreclr-path", &args.coreclr_path]);

    attach_epic_launch_token(&mut cmd, &args.platform).await?;
    launch_process(app, cmd, Some(args.profile_id))
}

pub async fn launch_vanilla<R: Runtime>(
    app: AppHandle<R>,
    args: LaunchVanillaArgs,
) -> AppResult<()> {
    let mut cmd = Command::new(&args.game_exe);
    attach_epic_launch_token(&mut cmd, &args.platform).await?;
    launch_process(app, cmd, None)
}
