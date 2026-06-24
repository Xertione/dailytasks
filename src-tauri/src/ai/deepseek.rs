use crate::ai::provider::AiProvider;
use crate::ai::prompt;
use crate::config::get_config;
use crate::db::models::AiResult;
use reqwest::Client;
use serde_json::Value;

pub struct DeepSeekProvider {
    client: Client,
    api_key: String,
    base_url: String,
    model: String,
}

impl DeepSeekProvider {
    pub fn new() -> Self {
        let config = get_config();
        let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_default();

        Self {
            client: Client::new(),
            api_key,
            base_url: config.ai.base_url.clone(),
            model: config.ai.model.clone(),
        }
    }
}

impl AiProvider for DeepSeekProvider {
    fn analyze(&self, title: &str, description: &str) -> Result<AiResult, String> {
        // Use the current runtime handle instead of creating a new Runtime
        // to avoid "cannot start a runtime from within a runtime" panic
        match tokio::runtime::Handle::try_current() {
            Ok(handle) => handle.block_on(self.analyze_async(title, description)),
            Err(_) => {
                // No tokio runtime active — create a temporary one
                let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
                rt.block_on(self.analyze_async(title, description))
            }
        }
    }

    fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
}

impl DeepSeekProvider {
    async fn analyze_async(&self, title: &str, description: &str) -> Result<AiResult, String> {
        let messages = prompt::build_messages(title, description);
        let config = get_config();

        let body = serde_json::json!({
            "model": self.model,
            "messages": messages,
            "max_tokens": config.ai.max_tokens,
            "temperature": config.ai.temperature,
        });

        let url = format!("{}/v1/chat/completions", self.base_url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("AI request failed: {}", e))?;

        let status = response.status();
        let text = response.text().await.map_err(|e| format!("Read response: {}", e))?;

        if !status.is_success() {
            return Err(format!("AI API error ({}): {}", status.as_u16(), text));
        }

        // Parse the response
        let parsed: Value =
            serde_json::from_str(&text).map_err(|e| format!("Parse response: {}", e))?;

        let content = parsed["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| "No content in AI response".to_string())?;

        extract_ai_result(content)
    }
}

fn extract_ai_result(content: &str) -> Result<AiResult, String> {
    // Try direct JSON parse
    if let Ok(result) = serde_json::from_str::<AiResult>(content) {
        return Ok(result);
    }

    // Try to extract first { ... } block
    let trimmed = content.trim();
    if let Some(start) = trimmed.find('{') {
        // Find matching closing brace
        let mut depth = 0;
        let mut end = 0;
        for (i, ch) in trimmed[start..].char_indices() {
            if ch == '{' {
                depth += 1;
            } else if ch == '}' {
                depth -= 1;
                if depth == 0 {
                    end = start + i + 1;
                    break;
                }
            }
        }

        if end > start {
            let json_block = &trimmed[start..end];
            if let Ok(result) = serde_json::from_str::<Value>(json_block) {
                let ai_result = AiResult {
                    star_value: result["star_value"].as_i64().unwrap_or(1) as i32,
                    value_score: result["value_score"].as_i64().unwrap_or(1) as i32,
                    urgency: result["urgency"].as_i64().unwrap_or(1) as i32,
                    potential: result["potential"].as_i64().unwrap_or(1) as i32,
                    reason: result["reason"].as_str().unwrap_or("").to_string(),
                    estimated_minutes: result["estimated_minutes"].as_i64().unwrap_or(30) as i32,
                };
                return Ok(ai_result);
            }
        }
    }

    // Fallback: return default values
    log::warn!("Failed to parse AI response, using defaults");
    Ok(AiResult {
        star_value: 1,
        value_score: 1,
        urgency: 1,
        potential: 1,
        reason: "无法解析 AI 返回结果".to_string(),
        estimated_minutes: 30,
    })
}
