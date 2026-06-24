use rand::Rng;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::OnceLock;

static NUDGES: OnceLock<NudgeStore> = OnceLock::new();

struct NudgeStore {
    nudges: HashMap<String, Vec<String>>,
    summaries: HashMap<String, String>,
}

pub fn init_nudges(prompts_dir: &Path) {
    let path = prompts_dir.join("nudges.toml");
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("Failed to read nudges.toml: {}, using defaults", e);
            return;
        }
    };

    let parsed: toml::Value = match toml::from_str(&content) {
        Ok(v) => v,
        Err(e) => {
            log::warn!("Failed to parse nudges.toml: {}", e);
            return;
        }
    };

    let mut nudges: HashMap<String, Vec<String>> = HashMap::new();
    let mut summaries: HashMap<String, String> = HashMap::new();

    if let toml::Value::Table(root) = parsed {
        for (style_key, style_val) in root {
            if let toml::Value::Table(scenarios) = style_val {
                for (scenario_key, scenario_val) in scenarios {
                    if scenario_key == "daily_summary" {
                        if let toml::Value::Table(summary) = scenario_val {
                            if let Some(toml::Value::String(template)) = summary.get("template") {
                                summaries.insert(style_key.clone(), template.clone());
                            }
                        }
                    } else if let toml::Value::Table(msg_group) = scenario_val {
                        if let Some(toml::Value::Array(msgs)) = msg_group.get("messages") {
                            let messages: Vec<String> = msgs
                                .iter()
                                .filter_map(|m| m.as_str().map(String::from))
                                .collect();
                            let key = format!("{}.{}", style_key, scenario_key);
                            nudges.insert(key, messages);
                        }
                    }
                }
            }
        }
    }

    NUDGES.get_or_init(|| NudgeStore { nudges, summaries });
}

pub fn get_nudge(style: &str, scenario: &str) -> String {
    let store = NUDGES.get();
    let key = format!("{}.{}", style, scenario);

    if let Some(store) = store {
        if let Some(messages) = store.nudges.get(&key) {
            if !messages.is_empty() {
                let mut rng = rand::thread_rng();
                let idx = rng.gen_range(0..messages.len());
                return messages[idx].clone();
            }
        }
        // Fallback: try gentle style
        let fallback_key = format!("gentle.{}", scenario);
        if style != "gentle" {
            if let Some(messages) = store.nudges.get(&fallback_key) {
                if !messages.is_empty() {
                    let mut rng = rand::thread_rng();
                    let idx = rng.gen_range(0..messages.len());
                    return messages[idx].clone();
                }
            }
        }
    }

    // Hardcoded fallbacks
    match scenario {
        "encouragement" => "慢慢来，不着急～".to_string(),
        "urging" => "这个任务该处理了哦。".to_string(),
        "achievement" => "太棒了！又完成了一项任务！".to_string(),
        _ => "继续加油！".to_string(),
    }
}

pub fn get_daily_summary(completed: i32, total: i32, style: &str) -> String {
    let store = NUDGES.get();
    let template = store
        .and_then(|s| s.summaries.get(style))
        .cloned()
        .unwrap_or_else(|| {
            "今日总结：完成 {completed} 个，总共 {total} 个。".to_string()
        });

    let remaining = total - completed;
    let extra = if remaining == 0 {
        "全部完成，今天表现完美！"
    } else if remaining <= 3 {
        "再接再厉，很快就完成了！"
    } else {
        "明天继续加油！"
    };

    template
        .replace("{completed}", &completed.to_string())
        .replace("{total}", &total.to_string())
        .replace("{extra}", extra)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn init() {
        let prompts_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("prompts");
        init_nudges(&prompts_dir);
    }

    #[test]
    fn test_gentle_encouragement() {
        init();
        let result = get_nudge("gentle", "encouragement");
        assert!(!result.is_empty());
    }

    #[test]
    fn test_direct_urging() {
        init();
        let result = get_nudge("direct", "urging");
        assert!(!result.is_empty());
    }

    #[test]
    fn test_humorous_achievement() {
        init();
        let result = get_nudge("humorous", "achievement");
        assert!(!result.is_empty());
    }

    #[test]
    fn test_nonexistent_style_fallbacks() {
        init();
        let result = get_nudge("nonexistent", "encouragement");
        assert!(!result.is_empty());
    }

    #[test]
    fn test_daily_summary_contains_numbers() {
        init();
        let result = get_daily_summary(5, 10, "gentle");
        assert!(result.contains("5"));
        assert!(result.contains("10"));
    }

    #[test]
    fn test_daily_summary_all_done() {
        init();
        let result = get_daily_summary(10, 10, "gentle");
        assert!(result.contains("全部完成"));
    }
}
