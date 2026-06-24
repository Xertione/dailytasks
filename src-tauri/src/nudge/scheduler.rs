use crate::config::get_config;
use crate::nudge::engine;
use tauri::{AppHandle, Emitter, Manager};
use crate::DbConnection;

pub fn start_scheduler(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        let mut last_daily_summary = String::new();

        loop {
            interval.tick().await;

            let config = get_config();
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

            // Check if it's time for daily summary
            let now = chrono::Utc::now().format("%H:%M").to_string();
            if now == config.app.daily_summary_time && last_daily_summary != today {
                last_daily_summary = today.clone();
                send_daily_summary(&app_handle);
            }

            // Check for tasks with remind_at
            check_reminders(&app_handle);

            // Check for stale tasks
            check_stale_tasks(&app_handle, &config);
        }
    });
}

fn check_reminders(app_handle: &AppHandle) {
    let db = app_handle.state::<DbConnection>();
    let conn = db.lock();

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M").to_string();

    let mut stmt = match conn.prepare(
        "SELECT id, title FROM tasks WHERE remind_at IS NOT NULL AND remind_at LIKE ?1 AND status != 'done' AND status != 'archived'",
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    let tasks: Vec<(String, String)> = match stmt.query_map(
        rusqlite::params![format!("{}%", now)],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    ) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => return,
    };

    for (id, title) in tasks {
        let nudge = engine::get_nudge("gentle", "urging");
        let payload = serde_json::json!({
            "task_id": id,
            "title": title,
            "message": nudge,
        });
        let _ = app_handle.emit("task-reminder", payload);
    }
}

fn check_stale_tasks(app_handle: &AppHandle, config: &crate::config::AppConfig) {
    let db = app_handle.state::<DbConnection>();
    let conn = db.lock();

    let stale_hours = config.app.idle_remind_hours;
    let cutoff = (chrono::Utc::now() - chrono::Duration::hours(stale_hours as i64))
        .format("%Y-%m-%dT%H:%M:%S")
        .to_string();

    let mut stmt = match conn.prepare(
        "SELECT id, title FROM tasks WHERE status = 'pending' AND created_at < ?1 AND (star_value = 0 OR star_value IS NULL)",
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    let tasks: Vec<(String, String)> = match stmt.query_map(
        rusqlite::params![cutoff],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
    ) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => return,
    };

    for (id, title) in tasks {
        let nudge = engine::get_nudge("gentle", "urging");
        let payload = serde_json::json!({
            "task_id": id,
            "title": title,
            "message": nudge,
        });
        let _ = app_handle.emit("task-stale", payload);
    }
}

fn send_daily_summary(app_handle: &AppHandle) {
    let db = app_handle.state::<DbConnection>();
    let conn = db.lock();

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let total: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status != 'archived'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let completed: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'done' AND date(completed_at) = ?1",
            rusqlite::params![today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let style = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'nudge_style'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "gentle".to_string());

    let summary = engine::get_daily_summary(completed, total, &style);
    let payload = serde_json::json!({
        "message": summary,
        "completed": completed,
        "total": total,
    });
    let _ = app_handle.emit("daily-summary", payload);
}
