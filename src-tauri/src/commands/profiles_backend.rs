/// Check if Among Us is already running.
#[tauri::command]
pub fn check_among_us_running() -> Result<bool, String> {
    use std::ffi::OsStr;
    use sysinfo::System;

    let mut sys = System::new_all();
    sys.refresh_all();

    let is_running = sys
        .processes_by_exact_name(OsStr::new("Among Us"))
        .next()
        .is_some();

    Ok(is_running)
}
