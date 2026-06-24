use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,         // pending | in_progress | done | archived
    pub progress: i32,          // 0-100, task progress percentage
    pub star_value: i32,        // 0=未评估, 1~10
    pub star_reason: String,
    pub urgency: i32,
    pub value_score: i32,
    pub potential: i32,
    pub estimated_min: i32,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub completion_note: String,    // 用户完成时写的备注
    pub countdown_secs: i32,        // 倒计时秒数，0=无倒计时
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyStats {
    pub date: String,
    pub completed_cnt: i32,
    pub total_cnt: i32,
    pub high_star_cnt: i32,
    pub total_stars: i32,       // accumulated stars from completed tasks
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResult {
    pub star_value: i32,
    pub value_score: i32,
    pub urgency: i32,
    pub potential: i32,
    pub reason: String,
    pub estimated_minutes: i32,
}
