use crate::ai::deepseek::DeepSeekProvider;
use crate::ai::local_rules;
use crate::ai::provider::AiProvider;
use crate::db::models::AiResult;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

use crate::DbConnection;

#[derive(Clone)]
pub struct AnalysisQueue {
    tx: tokio::sync::mpsc::UnboundedSender<QueueItem>,
}

struct QueueItem {
    task_id: String,
    title: String,
    description: String,
    due_at: Option<String>,
}

impl AnalysisQueue {
    pub fn new(app_handle: AppHandle) -> Self {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<QueueItem>();

        tokio::spawn(async move {
            let provider = Arc::new(DeepSeekProvider::new());

            while let Some(item) = rx.recv().await {
                let result = if provider.is_available() {
                    Self::analyze_with_retry(&provider, &item.title, &item.description).await
                } else {
                    Ok(local_rules::evaluate(
                        &item.title,
                        &item.description,
                        item.due_at.as_deref(),
                    ))
                };

                match result {
                    Ok(ai_result) => {
                        // Save result to database
                        if let Some(db) = app_handle.try_state::<DbConnection>() {
                            let conn = db.lock();
                            let now = chrono::Utc::now()
                                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                                .to_string();
                            let _ = conn.execute(
                                "UPDATE tasks SET star_value=?1, value_score=?2, urgency=?3, potential=?4, star_reason=?5, estimated_min=?6, updated_at=?7 WHERE id=?8",
                                rusqlite::params![
                                    ai_result.star_value,
                                    ai_result.value_score,
                                    ai_result.urgency,
                                    ai_result.potential,
                                    ai_result.reason,
                                    ai_result.estimated_minutes,
                                    now,
                                    item.task_id,
                                ],
                            );
                        }

                        // Emit event to frontend
                        let payload = serde_json::json!({
                            "task_id": item.task_id,
                            "star_value": ai_result.star_value,
                            "star_reason": ai_result.reason,
                        });
                        let _ = app_handle.emit("task:analyzed", payload);
                    }
                    Err(e) => {
                        log::warn!("AI analysis error for task {}: {}", item.task_id, e);
                        let payload = serde_json::json!({
                            "task_id": item.task_id,
                            "error": e,
                        });
                        let _ = app_handle.emit("task:analyzed", payload);
                    }
                }
            }
        });

        Self { tx }
    }

    async fn analyze_with_retry(
        provider: &DeepSeekProvider,
        title: &str,
        description: &str,
    ) -> Result<AiResult, String> {
        let max_retries = 2;
        let mut last_error = String::new();

        for attempt in 0..=max_retries {
            match provider.analyze(title, description) {
                Ok(result) => return Ok(result),
                Err(e) => {
                    last_error = e;
                    if attempt < max_retries {
                        log::warn!(
                            "AI analysis attempt {} failed, retrying...",
                            attempt + 1
                        );
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    }
                }
            }
        }

        Err(format!(
            "AI analysis failed after {} retries: {}",
            max_retries + 1,
            last_error
        ))
    }

    pub async fn enqueue(
        &self,
        task_id: String,
        title: String,
        description: String,
        due_at: Option<String>,
    ) {
        let item = QueueItem {
            task_id,
            title,
            description,
            due_at,
        };
        let _ = self.tx.send(item);
    }
}
