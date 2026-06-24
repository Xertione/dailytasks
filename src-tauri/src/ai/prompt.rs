use std::fs;
use std::path::Path;
use std::sync::OnceLock;

static PROMPT_TEMPLATE: OnceLock<String> = OnceLock::new();

pub fn init_prompt(prompts_dir: &Path) {
    let path = prompts_dir.join("star_eval.md");
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("Failed to read star_eval.md: {}, using built-in prompt", e);
            DEFAULT_PROMPT.to_string()
        }
    };
    PROMPT_TEMPLATE.get_or_init(|| content);
}

const DEFAULT_PROMPT: &str = r#"你是一个任务评估助手，负责分析用户的任务并给出星级评定。

## 评估维度

1. **重要程度 (value_score, 1-3)**: 任务对用户长期目标的重要性
2. **紧急程度 (urgency, 1-3)**: 任务的时间紧迫程度
3. **成长潜力 (potential, 1-3)**: 任务的成长价值
4. **综合星级 (star_value, 1-3)**: 综合评估

请以 JSON 格式返回：
{"star_value": 2, "value_score": 2, "urgency": 1, "potential": 2, "reason": "...", "estimated_minutes": 30}

## 用户任务
- **标题**: {title}
- **描述**: {description}"#;

pub fn build_messages(title: &str, description: &str) -> Vec<serde_json::Value> {
    let template = PROMPT_TEMPLATE
        .get()
        .map(|s| s.as_str())
        .unwrap_or(DEFAULT_PROMPT);

    let system_prompt = template
        .replace("{title}", title)
        .replace("{description}", description);

    vec![
        serde_json::json!({
            "role": "system",
            "content": system_prompt,
        }),
        serde_json::json!({
            "role": "user",
            "content": "请评估这个任务。",
        }),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn init() {
        let prompts_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("prompts");
        init_prompt(&prompts_dir);
    }

    #[test]
    fn test_build_messages_length() {
        init();
        let messages = build_messages("测试任务", "这是描述");
        assert_eq!(messages.len(), 2);
    }

    #[test]
    fn test_first_message_is_system() {
        init();
        let messages = build_messages("测试任务", "这是描述");
        assert_eq!(messages[0]["role"], "system");
    }

    #[test]
    fn test_second_message_is_user() {
        init();
        let messages = build_messages("测试任务", "这是描述");
        assert_eq!(messages[1]["role"], "user");
    }

    #[test]
    fn test_system_content_contains_title_and_description() {
        init();
        let messages = build_messages("测试任务", "这是描述");
        let content = messages[0]["content"].as_str().unwrap();
        assert!(content.contains("测试任务"));
        assert!(content.contains("这是描述"));
    }
}
