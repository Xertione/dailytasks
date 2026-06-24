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

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(config.ai.timeout_secs as u64))
            .build()
            .unwrap_or_default();

        Self {
            client,
            api_key,
            base_url: config.ai.base_url.clone(),
            model: config.ai.model.clone(),
        }
    }

    /// Get the effective API key — checks stored field first, then env var.
    /// This allows the save_api_key command (which sets env var at runtime)
    /// to take effect even after the provider was constructed.
    fn effective_key(&self) -> String {
        if !self.api_key.is_empty() {
            return self.api_key.clone();
        }
        std::env::var("DEEPSEEK_API_KEY").unwrap_or_default()
    }

    pub fn is_available(&self) -> bool {
        !self.effective_key().is_empty()
    }

    /// Direct async analysis — call this from tokio contexts
    pub async fn analyze_async(
        &self,
        title: &str,
        description: &str,
    ) -> Result<AiResult, String> {
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
            .header("Authorization", format!("Bearer {}", self.effective_key()))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("AI request failed: {}", e))?;

        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|e| format!("Read response: {}", e))?;

        if !status.is_success() {
            return Err(format!(
                "AI API error ({}): {}",
                status.as_u16(),
                if text.len() > 200 {
                    &text[..200]
                } else {
                    &text
                }
            ));
        }

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
                return Ok(AiResult {
                    star_value: result["star_value"].as_i64().unwrap_or(5) as i32,
                    value_score: result["value_score"].as_i64().unwrap_or(5) as i32,
                    urgency: result["urgency"].as_i64().unwrap_or(5) as i32,
                    potential: result["potential"].as_i64().unwrap_or(5) as i32,
                    reason: result["reason"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    estimated_minutes: result["estimated_minutes"].as_i64().unwrap_or(30)
                        as i32,
                });
            }
        }
    }

    // Fallback: return default values
    log::warn!("Failed to parse AI response, using defaults");
    Ok(AiResult {
        star_value: 5,
        value_score: 5,
        urgency: 5,
        potential: 5,
        reason: "无法解析 AI 返回结果".to_string(),
        estimated_minutes: 45,
    })
}
