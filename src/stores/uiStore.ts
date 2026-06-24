import { create } from 'zustand'

export type NudgeStyle = 'gentle' | 'direct' | 'humorous'

interface UiState {
  isSettingsOpen: boolean
  nudgeStyle: NudgeStyle
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  setNudgeStyle: (style: NudgeStyle) => void
}

export const useUiStore = create<UiState>((set) => ({
  isSettingsOpen: false,
  nudgeStyle: 'gentle',
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  setNudgeStyle: (style) => set({ nudgeStyle: style }),
}))
