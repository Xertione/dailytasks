use serde::{Deserialize, Serialize};
use crate::DbConnection;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,    // "user" or "assistant"
    pub content: String,
}

#[tauri::command]
pub async fn chat_with_ai(
    message: String,
    history: Vec<ChatMessage>,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    // Get recent task context for the AI
    let task_context = {
        let conn = db.lock();
        let mut task_context = String::from("用户的当前任务列表：\n");

        let mut stmt = conn.prepare(
            "SELECT title, status, star_value, progress, completion_note FROM tasks WHERE status != 'archived' ORDER BY created_at DESC LIMIT 10"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, i32>(3)?,
                row.get::<_, String>(4)?,
            ))
        }).map_err(|e| e.to_string())?;

        for row in rows {
            if let Ok((title, status, star, progress, note)) = row {
                let status_cn = match status.as_str() {
                    "pending" => "待处理",
                    "in_progress" => "进行中",
                    "done" => "已完成",
                    _ => &status,
                };
                task_context.push_str(&format!("- {title} [{status_cn}] 星:{star} 进度:{progress}%\n"));
                if !note.is_empty() {
                    task_context.push_str(&format!("  备注: {note}\n"));
                }
            }
        }
        task_context
    };
    
    // Build system prompt with task context
    let system = format!(
        "你是一个温暖、共情的任务教练。用户正在和你聊他们的任务进展和心情。\n\n{}\n\n请用简短温暖的中文回复（1-3句话为佳）。像朋友一样聊天，不要过于正式。根据用户的情绪给予适当鼓励或建议。",
        task_context
    );
    
    // Build messages array
    let mut messages = vec![
        serde_json::json!({"role": "system", "content": system}),
    ];
    for msg in &history {
        messages.push(serde_json::json!({"role": msg.role, "content": msg.content}));
    }
    messages.push(serde_json::json!({"role": "user", "content": message}));
    
    let config = crate::config::get_config();
    let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_default();
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(config.ai.timeout_secs as u64))
        .build()
        .unwrap_or_default();
    
    let url = format!("{}/v1/chat/completions", config.ai.base_url);
    let body = serde_json::json!({
        "model": config.ai.model,
        "messages": messages,
        "max_tokens": 500,
        "temperature": 0.8,
    });
    
    let response = client.post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let text = response.text().await.map_err(|e| format!("{}", e))?;
    let parsed: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("{}", e))?;
    
    parsed["choices"][0]["message"]["content"]
        .as_str()
        .map(String::from)
        .ok_or_else(|| "无回复内容".to_string())
}
