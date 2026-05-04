import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = {
  sidebarCollapsed: boolean
  selectedEntryId: number | null
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void
  setSelectedEntryId: (id: number | null) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      selectedEntryId: null,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSelectedEntryId: (id) => set({ selectedEntryId: id }),
    }),
    { name: 'ij-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
)
