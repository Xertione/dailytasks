use crate::db::models::AiResult;
use chrono::Utc;

pub fn evaluate(title: &str, description: &str, due_at: Option<&str>) -> AiResult {
    let text = format!("{} {}", title, description).to_lowercase();

    // Urgency keywords
    let urgency_keywords = ["今天", "明天", "截止", "urgent", "deadline", "马上", "立即", "尽快", "紧急"];
    let urgency_count = urgency_keywords.iter().filter(|k| text.contains(*k)).count();
    let mut urgency = if urgency_count >= 2 {
        3
    } else if urgency_count == 1 {
        2
    } else {
        1
    };

    // Check due_at proximity
    if let Some(due) = due_at {
        if let Ok(due_dt) = chrono::NaiveDateTime::parse_from_str(due, "%Y-%m-%dT%H:%M:%S") {
            let now = Utc::now().naive_utc();
            let diff = due_dt.signed_duration_since(now);
            if diff.num_hours() >= 0 && diff.num_hours() <= 24 {
                urgency = urgency.max(2);
            }
        }
    }

    // Value keywords
    let value_keywords = ["重要", "关键", "核心", "必须", "必要", "目标", "战略"];
    let value_count = value_keywords.iter().filter(|k| text.contains(*k)).count();
    let value_score = if value_count >= 2 {
        3
    } else if value_count == 1 {
        2
    } else {
        1
    };

    // Potential keywords
    let potential_keywords = ["学习", "成长", "提升", "技能", "阅读", "写作", "锻炼", "练习", "复习"];
    let potential_count = potential_keywords.iter().filter(|k| text.contains(*k)).count();
    let potential = if potential_count >= 2 {
        3
    } else if potential_count == 1 {
        2
    } else {
        1
    };

    // Star value = weighted average
    let star_value = ((value_score as f32 * 0.4 + urgency as f32 * 0.35 + potential as f32 * 0.25)
        .round() as i32)
        .max(1)
        .min(3);

    // Estimated minutes based on star
    let estimated_minutes = match star_value {
        3 => 60,
        2 => 30,
        _ => 15,
    };

    let reason = format!(
        "基于关键词分析：重要度={}，紧急度={}，潜力={}，综合星级={}",
        value_score, urgency, potential, star_value
    );

    AiResult {
        star_value,
        value_score,
        urgency,
        potential,
        reason,
        estimated_minutes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_urgency_keyword() {
        let result = evaluate("紧急任务", "", None);
        assert_eq!(result.urgency, 2, "单一紧急关键词 urgency 应为 2");

        let result2 = evaluate("紧急 尽快", "", None);
        assert_eq!(result2.urgency, 3, "两个紧急关键词 urgency 应为 3");
    }

    #[test]
    fn test_value_keyword() {
        let result = evaluate("重要任务", "", None);
        assert_eq!(result.value_score, 2, "单一重要关键词 value_score 应为 2");

        let result2 = evaluate("重要 关键", "", None);
        assert_eq!(result2.value_score, 3, "两个重要关键词 value_score 应为 3");
    }

    #[test]
    fn test_potential_keyword() {
        let result = evaluate("学习Python", "", None);
        assert_eq!(result.potential, 2, "单一学习关键词 potential 应为 2");

        let result2 = evaluate("学习 成长", "", None);
        assert_eq!(result2.potential, 3, "两个学习关键词 potential 应为 3");
    }

    #[test]
    fn test_due_at_within_24h() {
        let due_at = (chrono::Utc::now() + chrono::Duration::hours(1))
            .format("%Y-%m-%dT%H:%M:%S")
            .to_string();
        let result = evaluate("普通任务", "", Some(&due_at));
        assert!(result.urgency >= 2, "未来1h截止的任务 urgency 应 >= 2");
    }

    #[test]
    fn test_default_values() {
        let result = evaluate("普通任务", "", None);
        assert_eq!(result.urgency, 1);
        assert_eq!(result.value_score, 1);
        assert_eq!(result.potential, 1);
        assert!(result.star_value >= 1 && result.star_value <= 3);
    }

    #[test]
    fn test_empty_inputs_no_panic() {
        let result = evaluate("", "", None);
        assert_eq!(result.urgency, 1);
        assert_eq!(result.value_score, 1);
        assert_eq!(result.potential, 1);
    }
}
