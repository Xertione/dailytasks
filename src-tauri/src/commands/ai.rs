use crate::ai::queue::AnalysisQueue;
use crate::db::models::AiResult;
use crate::DbConnection;
use tauri::State;

#[tauri::command]
pub async fn analyze_task_manually(
    task_id: String,
    title: String,
    description: String,
    queue: State<'_, AnalysisQueue>,
    db: State<'_, DbConnection>,
) -> Result<AiResult, String> {
    // Get due_at from database first
    let due_at = {
        let conn = db.lock();
        conn.query_row(
            "SELECT due_at FROM tasks WHERE id = ?1",
            rusqlite::params![task_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .unwrap_or(None)
    };

    // Enqueue for AI analysis
    queue.enqueue(task_id.clone(), title.clone(), description.clone(), due_at.clone());

    // Return an immediate estimate using local rules
    let local_result =
        crate::ai::local_rules::evaluate(&title, &description, due_at.as_deref());

    Ok(local_result)
}

#[tauri::command]
pub async fn get_ai_status() -> Result<String, String> {
    let api_key = std::env::var("DEEPSEEK_API_KEY").ok();
    if api_key.is_some() {
        Ok("available".to_string())
    } else {
        Ok("offline".to_string())
    }
}
