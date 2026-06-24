use crate::db::models::AiResult;
use chrono::Utc;

pub fn evaluate(title: &str, description: &str, due_at: Option<&str>) -> AiResult {
    let text = format!("{} {}", title, description).to_lowercase();

    // Urgency keywords → score 8-10 when detected
    let urgency_keywords = [
        "今天", "明天", "截止", "urgent", "deadline", "马上", "立即", "尽快", "紧急",
    ];
    let urgency_count = urgency_keywords.iter().filter(|k| text.contains(*k)).count();
    let mut urgency = if urgency_count >= 2 {
        10
    } else if urgency_count == 1 {
        8
    } else {
        5
    };

    // Check due_at proximity: within 24h → urgency +3 (capped at 10)
    if let Some(due) = due_at {
        if let Ok(due_dt) = chrono::NaiveDateTime::parse_from_str(due, "%Y-%m-%dT%H:%M:%S")
        {
            let now = Utc::now().naive_utc();
            let diff = due_dt.signed_duration_since(now);
            if diff.num_hours() >= 0 && diff.num_hours() <= 24 {
                urgency = (urgency + 3).min(10);
            }
        }
    }

    // Value keywords → score 8-10 when detected
    let value_keywords = ["重要", "关键", "核心", "必须", "必要", "目标", "战略"];
    let value_count = value_keywords.iter().filter(|k| text.contains(*k)).count();
    let value_score = if value_count >= 2 {
        10
    } else if value_count == 1 {
        8
    } else {
        5
    };

    // Potential keywords → score 8-10 when detected
    let potential_keywords = [
        "学习", "成长", "提升", "技能", "阅读", "写作", "锻炼", "练习", "复习",
    ];
    let potential_count = potential_keywords.iter().filter(|k| text.contains(*k)).count();
    let potential = if potential_count >= 2 {
        10
    } else if potential_count == 1 {
        8
    } else {
        5
    };

    // Star value = weighted average rounded, clamped to 1-10
    let star_value = ((value_score as f32 * 0.4 + urgency as f32 * 0.35 + potential as f32 * 0.25)
        .round() as i32)
        .max(1)
        .min(10);

    // Estimated minutes based on star
    let estimated_minutes = match star_value {
        8..=10 => 90,
        5..=7 => 45,
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
        assert_eq!(result.urgency, 8, "单一紧急关键词 urgency 应为 8");

        let result2 = evaluate("紧急 尽快", "", None);
        assert_eq!(result2.urgency, 10, "两个紧急关键词 urgency 应为 10");
    }

    #[test]
    fn test_value_keyword() {
        let result = evaluate("重要任务", "", None);
        assert_eq!(result.value_score, 8, "单一重要关键词 value_score 应为 8");

        let result2 = evaluate("重要 关键", "", None);
        assert_eq!(result2.value_score, 10, "两个重要关键词 value_score 应为 10");
    }

    #[test]
    fn test_potential_keyword() {
        let result = evaluate("学习Python", "", None);
        assert_eq!(result.potential, 8, "单一学习关键词 potential 应为 8");

        let result2 = evaluate("学习 成长", "", None);
        assert_eq!(result2.potential, 10, "两个学习关键词 potential 应为 10");
    }

    #[test]
    fn test_due_at_within_24h() {
        let due_at = (chrono::Utc::now() + chrono::Duration::hours(1))
            .format("%Y-%m-%dT%H:%M:%S")
            .to_string();
        let result = evaluate("普通任务", "", Some(&due_at));
        assert!(result.urgency >= 8, "未来1h截止的任务 urgency 应 >= 8 (5 + 3)");
    }

    #[test]
    fn test_default_values() {
        let result = evaluate("普通任务", "", None);
        assert_eq!(result.urgency, 5);
        assert_eq!(result.value_score, 5);
        assert_eq!(result.potential, 5);
        assert!(result.star_value >= 1 && result.star_value <= 10);
    }

    #[test]
    fn test_empty_inputs_no_panic() {
        let result = evaluate("", "", None);
        assert_eq!(result.urgency, 5);
        assert_eq!(result.value_score, 5);
        assert_eq!(result.potential, 5);
    }
}
