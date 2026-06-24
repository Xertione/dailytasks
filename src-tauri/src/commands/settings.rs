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
