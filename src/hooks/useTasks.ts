import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  addTask as ipcAddTask,
  updateTask as ipcUpdateTask,
  deleteTask as ipcDeleteTask,
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
      star_value: number; due_at: string | null; remind_at: string | null
    }) =>
      ipcUpdateTask(params.id, params.title, params.description, params.status, params.star_value, params.due_at, params.remind_at),
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
