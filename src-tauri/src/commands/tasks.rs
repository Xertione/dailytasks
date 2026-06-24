use crate::ai::queue::AnalysisQueue;
use crate::db::models::{DailyStats, Task};
use crate::DbConnection;
use tauri::State;

#[tauri::command]
pub fn add_task(
    title: String,
    description: String,
    due_at: Option<String>,
    remind_at: Option<String>,
    db: State<'_, DbConnection>,
    queue: State<'_, AnalysisQueue>,
) -> Result<Task, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();

    let task = Task {
        id: id.clone(),
        title: title.clone(),
        description: description.clone(),
        status: "pending".to_string(),
        progress: 0,
        star_value: 0,
        star_reason: String::new(),
        urgency: 0,
        value_score: 0,
        potential: 0,
        estimated_min: 0,
        due_at: due_at.clone(),
        remind_at: remind_at.clone(),
        created_at: now.clone(),
        updated_at: now.clone(),
        completed_at: None,
    };

    let conn = db.lock();
    conn.execute(
        "INSERT INTO tasks (id, title, description, status, progress, star_value, star_reason, urgency, value_score, potential, estimated_min, due_at, remind_at, created_at, updated_at, completed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        rusqlite::params![
            task.id, task.title, task.description, task.status, task.progress,
            task.star_value, task.star_reason, task.urgency, task.value_score,
            task.potential, task.estimated_min, task.due_at, task.remind_at,
            task.created_at, task.updated_at, task.completed_at
        ],
    )
    .map_err(|e| e.to_string())?;

    // Enqueue for AI analysis
    let q = (*queue).clone();
    let tid = task.id.clone();
    let ttl = task.title.clone();
    let desc = task.description.clone();
    let due = task.due_at.clone();
    tauri::async_runtime::spawn(async move {
        q.enqueue(tid, ttl, desc, due).await;
    });

    Ok(task)
}

#[tauri::command]
pub fn update_task(
    id: String,
    title: String,
    description: String,
    status: String,
    progress: i32,
    star_value: i32,
    due_at: Option<String>,
    remind_at: Option<String>,
    db: State<'_, DbConnection>,
) -> Result<Task, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let completed_at = if status == "done" {
        Some(now.clone())
    } else {
        None
    };

    let conn = db.lock();
    conn.execute(
        "UPDATE tasks SET title=?1, description=?2, status=?3, progress=?4, star_value=?5, due_at=?6, remind_at=?7, updated_at=?8, completed_at=?9 WHERE id=?10",
        rusqlite::params![title, description, status, progress, star_value, due_at, remind_at, now, completed_at, id],
    )
    .map_err(|e| e.to_string())?;

    get_task_internal(&conn, &id)
}

#[tauri::command]
pub fn delete_task(id: String, db: State<'_, DbConnection>) -> Result<(), String> {
    let conn = db.lock();
    conn.execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_tasks(db: State<'_, DbConnection>) -> Result<Vec<Task>, String> {
    let conn = db.lock();
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, progress, star_value, star_reason, urgency, value_score, potential, estimated_min, due_at, remind_at, created_at, updated_at, completed_at
             FROM tasks ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let tasks: Vec<Task> = stmt
        .query_map([], map_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn get_task(id: String, db: State<'_, DbConnection>) -> Result<Task, String> {
    let conn = db.lock();
    get_task_internal(&conn, &id)
}

fn get_task_internal(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<Task, String> {
    conn.query_row(
        "SELECT id, title, description, status, progress, star_value, star_reason, urgency, value_score, potential, estimated_min, due_at, remind_at, created_at, updated_at, completed_at
         FROM tasks WHERE id = ?1",
        rusqlite::params![id],
        map_task,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_today_stats(db: State<'_, DbConnection>) -> Result<DailyStats, String> {
    let conn = db.lock();

    let total_cnt: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status != 'archived'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let completed_cnt: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'done'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let high_star_cnt: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE star_value >= 3 AND status != 'archived'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_stars: i32 = conn
        .query_row(
            "SELECT COALESCE(SUM(star_value), 0) FROM tasks WHERE status = 'done'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    Ok(DailyStats {
        date: today,
        completed_cnt,
        total_cnt,
        high_star_cnt,
        total_stars,
    })
}

#[tauri::command]
pub fn update_progress(
    id: String,
    progress: i32,
    db: State<'_, DbConnection>,
) -> Result<Task, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let conn = db.lock();

    // Auto-transition to done when progress reaches 100
    let completed_at = if progress >= 100 {
        Some(now.clone())
    } else {
        None
    };
    let new_status = if progress >= 100 {
        "done"
    } else {
        "in_progress"
    };

    conn.execute(
        "UPDATE tasks SET progress=?1, status=?2, updated_at=?3, completed_at=?4 WHERE id=?5",
        rusqlite::params![progress, new_status, now, completed_at, id],
    )
    .map_err(|e| e.to_string())?;

    get_task_internal(&conn, &id)
}

#[tauri::command]
pub fn update_star_rating(
    id: String,
    star_value: i32,
    value_score: i32,
    urgency: i32,
    potential: i32,
    reason: String,
    db: State<'_, DbConnection>,
) -> Result<Task, String> {
    let now = chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string();
    let conn = db.lock();
    conn.execute(
        "UPDATE tasks SET star_value=?1, value_score=?2, urgency=?3, potential=?4, star_reason=?5, updated_at=?6 WHERE id=?7",
        rusqlite::params![star_value, value_score, urgency, potential, reason, now, id],
    )
    .map_err(|e| e.to_string())?;

    get_task_internal(&conn, &id)
}

fn map_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        progress: row.get(4)?,
        star_value: row.get(5)?,
        star_reason: row.get(6)?,
        urgency: row.get(7)?,
        value_score: row.get(8)?,
        potential: row.get(9)?,
        estimated_min: row.get(10)?,
        due_at: row.get(11)?,
        remind_at: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        completed_at: row.get(15)?,
    })
}
