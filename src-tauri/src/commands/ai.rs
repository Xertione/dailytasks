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
    let mut local_result =
        crate::ai::local_rules::evaluate(&title, &description, due_at.as_deref());
    local_result.reason = format!("📋 本地: {}", local_result.reason);

    Ok(local_result)
}

#[tauri::command]
pub async fn get_ai_status() -> Result<serde_json::Value, String> {
    let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_default();
    let key_len = api_key.len();
    let key_prefix = if key_len > 8 {
        format!("{}...{}", &api_key[..4], &api_key[key_len-4..])
    } else if key_len > 0 {
        format!("{} (len={})", &api_key[..key_len.min(4)], key_len)
    } else {
        "(空)".to_string()
    };

    let config = crate::config::get_config();
    
    let mut status = serde_json::json!({
        "has_key": !api_key.is_empty(),
        "key_preview": key_prefix,
        "key_length": key_len,
        "model": config.ai.model,
        "base_url": config.ai.base_url,
        "status": if api_key.is_empty() { "offline" } else { "ready" },
    });

    // Quick connectivity test if key is available
    if !api_key.is_empty() {
        match quick_api_test(&api_key, &config.ai.base_url, &config.ai.model).await {
            Ok(msg) => {
                status["api_test"] = serde_json::json!("ok");
                status["api_test_msg"] = serde_json::json!(msg);
            }
            Err(e) => {
                status["api_test"] = serde_json::json!("fail");
                status["api_test_msg"] = serde_json::json!(e);
                status["status"] = serde_json::json!("error");
            }
        }
    }

    Ok(status)
}

async fn quick_api_test(api_key: &str, base_url: &str, model: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建客户端失败: {}", e))?;

    let url = format!("{}/v1/chat/completions", base_url);
    let body = serde_json::json!({
        "model": model,
        "messages": [
            {"role": "user", "content": "hi"}
        ],
        "max_tokens": 5,
        "temperature": 0.0,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    let status = response.status();
    if status.is_success() {
        Ok(format!("API 连接正常 (HTTP {})", status.as_u16()))
    } else {
        let text = response.text().await.unwrap_or_default();
        Err(format!("API 返回错误 HTTP {}: {}", status.as_u16(), 
            if text.len() > 150 { format!("{}...", &text[..150]) } else { text }))
    }
}
