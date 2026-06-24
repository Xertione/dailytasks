use rusqlite::{Connection, Result as SqliteResult};
use std::path::Path;

pub mod models;

pub fn init_db(app_dir: &Path) -> SqliteResult<Connection> {
    std::fs::create_dir_all(app_dir).ok();

    let db_path = app_dir.join("daily_tasks.db");
    let conn = Connection::open(&db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            progress INTEGER NOT NULL DEFAULT 0,
            star_value INTEGER NOT NULL DEFAULT 0,
            star_reason TEXT NOT NULL DEFAULT '',
            urgency INTEGER NOT NULL DEFAULT 0,
            value_score INTEGER NOT NULL DEFAULT 0,
            potential INTEGER NOT NULL DEFAULT 0,
            estimated_min INTEGER NOT NULL DEFAULT 0,
            due_at TEXT,
            remind_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY,
            completed_cnt INTEGER NOT NULL DEFAULT 0,
            total_cnt INTEGER NOT NULL DEFAULT 0,
            high_star_cnt INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT ''
        );",
    )?;

    // Migration: add progress column if missing (for existing databases)
    let has_progress: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='progress'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if has_progress == 0 {
        conn.execute_batch("ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;")
            .ok();
        log::info!("Migration: added progress column to tasks");
    }

    log::info!("Database initialized at {:?}", db_path);
    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_init_db_returns_ok() {
        let dir = tempdir().expect("Failed to create temp dir");
        let result = init_db(dir.path());
        assert!(result.is_ok());
    }

    #[test]
    fn test_tasks_table_exists() {
        let dir = tempdir().expect("Failed to create temp dir");
        let conn = init_db(dir.path()).expect("init_db failed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks'",
                [],
                |row| row.get(0),
            )
            .expect("Query failed");

        assert_eq!(count, 1, "tasks 表应该存在");
    }

    #[test]
    fn test_daily_stats_table_exists() {
        let dir = tempdir().expect("Failed to create temp dir");
        let conn = init_db(dir.path()).expect("init_db failed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='daily_stats'",
                [],
                |row| row.get(0),
            )
            .expect("Query failed");

        assert_eq!(count, 1, "daily_stats 表应该存在");
    }

    #[test]
    fn test_settings_table_exists() {
        let dir = tempdir().expect("Failed to create temp dir");
        let conn = init_db(dir.path()).expect("init_db failed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'",
                [],
                |row| row.get(0),
            )
            .expect("Query failed");

        assert_eq!(count, 1, "settings 表应该存在");
    }
}
