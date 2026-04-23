import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Organization } from '../types'

/**
 * Auth Store - Manages authentication state
 */

export interface AuthState {
  // State
  profile: Profile | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setProfile: (profile: Profile | null) => void
  setOrganization: (organization: Organization | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  initialize: (profile: Profile, organization?: Organization | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      profile: null,
      organization: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Actions
      setProfile: (profile) =>
        set({
          profile,
          isAuthenticated: !!profile,
          error: null,
        }),

      setOrganization: (organization) =>
        set({ organization }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      clearAuth: () =>
        set({
          profile: null,
          organization: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }),

      initialize: (profile, organization = null) =>
        set({
          profile,
          organization,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'eduator-auth',
      partialize: (state) => ({
        // Only persist certain fields
        profile: state.profile,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

/**
 * Auth selectors
 */
export const selectProfile = (state: AuthState) => state.profile
export const selectOrganization = (state: AuthState) => state.organization
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectProfileType = (state: AuthState) => state.profile?.profile_type
export const selectOrganizationId = (state: AuthState) => state.profile?.organization_id
