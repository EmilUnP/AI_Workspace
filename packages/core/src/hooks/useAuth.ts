'use client'

import { useCallback } from 'react'
import { useAuthStore } from '../store/auth'

/**
 * Auth hook - Provides authentication state and actions
 */
export function useAuth() {
  const {
    profile,
    organization,
    isAuthenticated,
    isLoading,
    error,
    setProfile,
    setOrganization,
    setLoading,
    setError,
    clearAuth,
    initialize,
  } = useAuthStore()

  return {
    // State
    profile,
    organization,
    isAuthenticated,
    isLoading,
    error,

    // Derived state
    profileType: profile?.profile_type,
    organizationId: profile?.organization_id,
    isPlatformOwner: profile?.profile_type === 'platform_owner',
    isSchoolAdmin: profile?.profile_type === 'school_superadmin',
    isTeacher: profile?.profile_type === 'teacher',
    isApproved: profile?.approval_status === 'approved',
    isPending: profile?.approval_status === 'pending',

    // Actions
    setProfile,
    setOrganization,
    setLoading,
    setError,
    clearAuth,
    initialize,
  }
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(allowedRoles: string[]) {
  const { profile, isAuthenticated } = useAuth()

  if (!isAuthenticated || !profile) return false

  return allowedRoles.includes(profile.profile_type)
}

/**
 * Hook to check if user can access organization
 */
export function useCanAccessOrganization(organizationId: string | null) {
  const { profile, isAuthenticated } = useAuth()

  if (!isAuthenticated || !profile) return false

  // Platform owners can access all organizations
  if (profile.profile_type === 'platform_owner') return true

  // Others can only access their own organization
  return profile.organization_id === organizationId
}

/**
 * Hook to get user permissions based on role
 */
export function usePermissions() {
  const { profile, isAuthenticated } = useAuth()

  const getPermissions = useCallback(() => {
    if (!isAuthenticated || !profile) {
      return {
        canManageOrganizations: false,
        canManageUsers: false,
        canApproveUsers: false,
        canViewAnalytics: false,
        canCreateExams: false,
        canEditExams: false,
        canDeleteExams: false,
        canViewExams: false,
        canTakeExams: false,
        canUseChatbot: false,
        canExportData: false,
      }
    }

    switch (profile.profile_type) {
      case 'platform_owner':
        return {
          canManageOrganizations: true,
          canManageUsers: true,
          canApproveUsers: true,
          canViewAnalytics: true,
          canCreateExams: true,
          canEditExams: true,
          canDeleteExams: true,
          canViewExams: true,
          canTakeExams: false,
          canUseChatbot: true,
          canExportData: true,
        }
      case 'school_superadmin':
        return {
          canManageOrganizations: false,
          canManageUsers: true,
          canApproveUsers: true,
          canViewAnalytics: true,
          canCreateExams: false,
          canEditExams: false,
          canDeleteExams: false,
          canViewExams: true,
          canTakeExams: false,
          canUseChatbot: true,
          canExportData: true,
        }
      case 'teacher':
        return {
          canManageOrganizations: false,
          canManageUsers: false,
          canApproveUsers: false,
          canViewAnalytics: true,
          canCreateExams: true,
          canEditExams: true,
          canDeleteExams: true,
          canViewExams: true,
          canTakeExams: false,
          canUseChatbot: true,
          canExportData: true,
        }
      default:
        return {
          canManageOrganizations: false,
          canManageUsers: false,
          canApproveUsers: false,
          canViewAnalytics: false,
          canCreateExams: false,
          canEditExams: false,
          canDeleteExams: false,
          canViewExams: false,
          canTakeExams: false,
          canUseChatbot: false,
          canExportData: false,
        }
    }
  }, [isAuthenticated, profile])

  return getPermissions()
}
