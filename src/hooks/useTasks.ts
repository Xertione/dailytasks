import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  addTask as ipcAddTask,
  updateTask as ipcUpdateTask,
  updateProgress as ipcUpdateProgress,
  deleteTask as ipcDeleteTask,
  completeTask as ipcCompleteTask,
  getTodayStats,
} from '@/lib/ipc'
import type { Task, DailyStats } from '@/lib/ipc'

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  })
}

export function useAddTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { title: string; description?: string; due_at?: string | null; remind_at?: string | null }) =>
      ipcAddTask(params.title, params.description ?? '', params.due_at ?? null, params.remind_at ?? null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todayStats'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      id: string; title: string; description: string; status: string
      progress: number; star_value: number; due_at: string | null; remind_at: string | null
    }) =>
      ipcUpdateTask(params.id, params.title, params.description, params.status, params.progress, params.star_value, params.due_at, params.remind_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todayStats'] })
    },
  })
}

export function useUpdateProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; progress: number }) =>
      ipcUpdateProgress(params.id, params.progress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todayStats'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipcDeleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todayStats'] })
    },
  })
}

export function useTodayStats() {
  return useQuery<DailyStats>({
    queryKey: ['todayStats'],
    queryFn: getTodayStats,
    refetchInterval: 30_000,
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ipcCompleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['todayStats'] })
    },
  })
}
