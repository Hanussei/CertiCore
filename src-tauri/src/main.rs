// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn check_license() -> Result<String, String> {
    Ok("active".to_string())
}

#[tauri::command]
fn audit_log(action: String, user: String) -> Result<(), String> {
    println!("Audit Log: {} by {}", action, user);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            check_license,
            audit_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
