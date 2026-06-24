use crate::ai::deepseek::DeepSeekProvider;
use crate::ai::local_rules;
use crate::db::models::AiResult;
use std::panic::AssertUnwindSafe;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use futures::FutureExt;

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

        tauri::async_runtime::spawn(async move {
            log::info!("AI analysis queue worker started");
            let provider = Arc::new(DeepSeekProvider::new());
            log::info!(
                "DeepSeekProvider initialized: available={}, model={}",
                provider.is_available(),
                provider.model_name()
            );

            while let Some(item) = rx.recv().await {
                log::info!(
                    "AI queue: processing task {} — '{}'",
                    item.task_id,
                    item.title
                );

                // Wrap in catch_unwind so a panic in one task doesn't kill the whole queue
                let fut = async {
                    Self::process_item(&app_handle, &provider, &item).await
                };
                let result = AssertUnwindSafe(fut).catch_unwind().await;

                match result {
                    Ok(()) => {}
                    Err(panic_err) => {
                        let msg = if let Some(s) = panic_err.downcast_ref::<String>() {
                            s.clone()
                        } else if let Some(s) = panic_err.downcast_ref::<&str>() {
                            s.to_string()
                        } else {
                            "unknown panic".to_string()
                        };
                        log::error!(
                            "AI queue worker panicked processing task {}: {}",
                            item.task_id,
                            msg
                        );
                        // Still emit an event so the frontend refreshes
                        let payload = serde_json::json!({
                            "task_id": item.task_id,
                            "star_value": 0,
                            "star_reason": format!("处理异常: {}", msg),
                        });
                        let _ = app_handle.emit("task:analyzed", payload);
                    }
                }
            }

            log::warn!("AI analysis queue worker stopped — channel closed");
        });

        Self { tx }
    }

    async fn process_item(
        app_handle: &AppHandle,
        provider: &Arc<DeepSeekProvider>,
        item: &QueueItem,
    ) {
        // Try AI first if available, always fall back to local rules on failure
        let (ai_result, ai_source, ai_error) = if provider.is_available() {
            match Self::analyze_with_retry(provider, &item.title, &item.description).await {
                Ok(mut result) => {
                    log::info!(
                        "AI analysis succeeded for task {}: star={}",
                        item.task_id,
                        result.star_value
                    );
                    result.reason = format!("🤖 AI: {}", result.reason);
                    (result, "ai", None)
                }
                Err(e) => {
                    log::warn!(
                        "AI analysis failed for task '{}', using local rules: {}",
                        item.title,
                        e
                    );
                    let mut local = local_rules::evaluate(&item.title, &item.description, item.due_at.as_deref());
                    local.reason = format!("📋 本地 (AI异常: {}): {}", 
                        if e.len() > 60 { format!("{}...", &e[..60]) } else { e.clone() },
                        local.reason
                    );
                    (local, "local", Some(e))
                }
            }
        } else {
            log::info!(
                "AI not available (no API key), using local rules for task '{}'",
                item.title
            );
            let mut local = local_rules::evaluate(&item.title, &item.description, item.due_at.as_deref());
            local.reason = format!("📋 本地 (未配置API Key): {}", local.reason);
            (local, "local", None)
        };

        // Save result to database
        if let Some(db) = app_handle.try_state::<DbConnection>() {
            let conn = db.lock();
            let now = chrono::Utc::now()
                .format("%Y-%m-%dT%H:%M:%S%.3fZ")
                .to_string();
            if let Err(e) = conn.execute(
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
            ) {
                log::error!(
                    "Failed to update task {} in DB: {}",
                    item.task_id,
                    e
                );
            } else {
                log::info!(
                    "DB updated for task {}: star={}, source={}, reason='{}'",
                    item.task_id,
                    ai_result.star_value,
                    ai_source,
                    ai_result.reason
                );
            }
        } else {
            log::error!("DbConnection state not found — cannot save AI result for task {}", item.task_id);
        }

        // Emit event with source info so frontend can display it
        let mut payload = serde_json::json!({
            "task_id": item.task_id,
            "star_value": ai_result.star_value,
            "star_reason": ai_result.reason,
            "ai_source": ai_source,
        });
        if let Some(ref err) = ai_error {
            payload["ai_error"] = serde_json::json!(err);
        }
        if let Err(e) = app_handle.emit("task:analyzed", payload) {
            log::error!("Failed to emit task:analyzed event: {}", e);
        }
    }

    async fn analyze_with_retry(
        provider: &DeepSeekProvider,
        title: &str,
        description: &str,
    ) -> Result<AiResult, String> {
        let max_retries = 2;
        let mut last_error = String::new();

        for attempt in 0..=max_retries {
            match provider.analyze_async(title, description).await {
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

    pub fn enqueue(
        &self,
        task_id: String,
        title: String,
        description: String,
        due_at: Option<String>,
    ) {
        log::info!("AI queue: enqueuing task {}", task_id);
        let item = QueueItem {
            task_id,
            title,
            description,
            due_at,
        };
        let _ = self.tx.send(item);
    }
}
