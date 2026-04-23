import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * UI Store - Manages UI state like sidebar, theme, notifications
 */

export type Theme = 'light' | 'dark' | 'system'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Theme
  theme: Theme

  // Toasts/Notifications
  toasts: Toast[]

  // Modal
  activeModal: string | null
  modalData: Record<string, unknown> | null

  // Loading states
  globalLoading: boolean
  loadingMessage: string | null

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: Theme) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  openModal: (modalId: string, data?: Record<string, unknown>) => void
  closeModal: () => void
  setGlobalLoading: (loading: boolean, message?: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      toasts: [],
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: null,

      // Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      setTheme: (theme) =>
        set({ theme }),

      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
          ],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () =>
        set({ toasts: [] }),

      openModal: (modalId, data) =>
        set({ activeModal: modalId, modalData: data ?? null }),

      closeModal: () =>
        set({ activeModal: null, modalData: null }),

      setGlobalLoading: (loading, message) =>
        set({ globalLoading: loading, loadingMessage: message ?? null }),
    }),
    {
      name: 'eduator-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

/**
 * Toast helper functions
 */
export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'success', title, message, duration: 5000 }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'error', title, message, duration: 7000 }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'warning', title, message, duration: 5000 }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'info', title, message, duration: 5000 }),
}

/**
 * UI selectors
 */
export const selectTheme = (state: UIState) => state.theme
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen
export const selectToasts = (state: UIState) => state.toasts
export const selectActiveModal = (state: UIState) => state.activeModal
