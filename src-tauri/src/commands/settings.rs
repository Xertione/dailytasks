use std::collections::HashMap;
use tauri::State;

use crate::DbConnection;

#[tauri::command]
pub fn get_settings(db: State<'_, DbConnection>) -> Result<HashMap<String, String>, String> {
    let conn = db.lock();
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut settings = HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        settings.insert(k, v);
    }
    Ok(settings)
}

#[tauri::command]
pub fn set_setting(
    key: String,
    value: String,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.lock();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_nudge_style(db: State<'_, DbConnection>) -> Result<String, String> {
    let conn = db.lock();
    let style: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'nudge_style'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "gentle".to_string());
    Ok(style)
}

#[tauri::command]
pub fn set_nudge_style(
    style: String,
    db: State<'_, DbConnection>,
) -> Result<(), String> {
    let conn = db.lock();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('nudge_style', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1",
        rusqlite::params![style],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn is_first_run() -> Result<bool, String> {
    let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_default();
    Ok(api_key.is_empty())
}

#[tauri::command]
pub fn save_api_key(api_key: String, db: State<'_, DbConnection>) -> Result<(), String> {
    // Save to settings table
    let conn = db.lock();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('deepseek_api_key', ?1) ON CONFLICT(key) DO UPDATE SET value=?1",
        rusqlite::params![api_key],
    )
    .map_err(|e| e.to_string())?;
    // Also set env var for current session
    std::env::set_var("DEEPSEEK_API_KEY", &api_key);

    // Try to write to .env file
    if let Ok(cwd) = std::env::current_dir() {
        let env_path = cwd.join(".env");
        let content = format!("DEEPSEEK_API_KEY={}\n", api_key);
        let _ = std::fs::write(&env_path, content);
    }
    // Also write to executable directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let env_path = parent.join(".env");
            let content = format!("DEEPSEEK_API_KEY={}\n", api_key);
            let _ = std::fs::write(&env_path, content);
        }
    }

    Ok(())
}

