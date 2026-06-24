import { invoke } from '@tauri-apps/api/core'

// ============================================
// 数据模型（Rust 返回的是 snake_case，接口层保持不变）
// ============================================

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  progress: number
  star_value: number
  star_reason: string
  urgency: number
  value_score: number
  potential: number
  estimated_min: number
  due_at: string | null
  remind_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  completion_note: string
  countdown_secs: number
}

export interface DailyStats {
  date: string
  completed_cnt: number
  total_cnt: number
  high_star_cnt: number
  total_stars: number
}

export interface AiResult {
  star_value: number
  value_score: number
  urgency: number
  potential: number
  reason: string
  estimated_minutes: number
}

// ============================================
// 命令（Tauri 2.0 自动 camelCase 转换参数名）
// ============================================

export async function addTask(
  title: string,
  description: string = '',
  dueAt: string | null = null,
  remindAt: string | null = null,
): Promise<Task> {
  return invoke('add_task', { title, description, dueAt, remindAt })
}

export async function updateTask(
  id: string,
  title: string,
  description: string,
  status: string,
  progress: number,
  starValue: number,
  dueAt: string | null,
  remindAt: string | null,
): Promise<Task> {
  return invoke('update_task', {
    id, title, description, status,
    progress, starValue, dueAt, remindAt,
  })
}

export async function updateProgress(id: string, progress: number): Promise<Task> {
  return invoke('update_progress', { id, progress })
}

export async function deleteTask(id: string): Promise<void> {
  return invoke('delete_task', { id })
}

export async function getTasks(): Promise<Task[]> {
  return invoke('get_all_tasks')
}

export async function getTask(id: string): Promise<Task> {
  return invoke('get_task', { id })
}

export async function getTodayStats(): Promise<DailyStats> {
  return invoke('get_today_stats')
}

export async function updateStarRating(
  id: string,
  starValue: number,
  valueScore: number,
  urgency: number,
  potential: number,
  reason: string,
): Promise<Task> {
  return invoke('update_star_rating', {
    id, starValue, valueScore,
    urgency, potential, reason,
  })
}

export async function completeTask(id: string): Promise<Task> {
  return invoke('complete_task_with_progress', { id })
}

// ============================================
// AI 分析命令
// ============================================

export async function analyzeTaskManually(
  taskId: string,
  title: string,
  description: string,
): Promise<AiResult> {
  return invoke('analyze_task_manually', { taskId, title, description })
}

export async function getAiStatus(): Promise<string> {
  return invoke('get_ai_status')
}

// ============================================
// 设置命令
// ============================================

export async function getSettings(): Promise<Record<string, string>> {
  return invoke('get_settings')
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke('set_setting', { key, value })
}

export async function getNudgeStyle(): Promise<string> {
  return invoke('get_nudge_style')
}

export async function setNudgeStyle(style: string): Promise<void> {
  return invoke('set_nudge_style', { style })
}

export async function setCountdown(id: string, countdownSecs: number): Promise<Task> {
  return invoke('set_countdown', { id, countdownSecs })
}

export async function completeWithNote(id: string, note: string): Promise<Task> {
  return invoke('complete_with_note', { id, note })
}
