import { invoke } from '@tauri-apps/api/core'

// ============================================
// 数据模型（与 Rust 后端 Task 结构一致）
// ============================================

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'done' | 'archived'
  progress: number             // 0-100
  star_value: number           // 0=未评估, 1~3
  star_reason: string          // AI 打分理由
  urgency: number              // 紧急度 1~3
  value_score: number          // 价值 1~3
  potential: number            // 潜力 1~3
  estimated_min: number        // 预估耗时（分钟）
  due_at: string | null        // 截止时间
  remind_at: string | null     // 提醒时间
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface DailyStats {
  date: string
  completed_cnt: number
  total_cnt: number
  high_star_cnt: number
  total_stars: number  // accumulated stars from done tasks
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
// 任务 CRUD 命令
// ============================================

export async function addTask(
  title: string,
  description: string = '',
  due_at: string | null = null,
  remind_at: string | null = null,
): Promise<Task> {
  return invoke('add_task', { title, description, due_at, remind_at })
}

export async function updateTask(
  id: string,
  title: string,
  description: string,
  status: string,
  progress: number,
  star_value: number,
  due_at: string | null,
  remind_at: string | null,
): Promise<Task> {
  return invoke('update_task', {
    id, title, description, status,
    progress, star_value, due_at, remind_at,
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
  star_value: number,
  value_score: number,
  urgency: number,
  potential: number,
  reason: string,
): Promise<Task> {
  return invoke('update_star_rating', {
    id, star_value, value_score,
    urgency, potential, reason,
  })
}

// ============================================
// AI 分析命令
// ============================================

export async function analyzeTaskManually(
  task_id: string,
  title: string,
  description: string,
): Promise<AiResult> {
  return invoke('analyze_task_manually', { task_id, title, description })
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
