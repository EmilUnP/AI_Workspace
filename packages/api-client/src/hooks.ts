'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, isSuccess } from './client'
import {
  platformOwnerEndpoints,
  teacherEndpoints,
  studentEndpoints,
  profileEndpoints,
} from './endpoints'
import type {
  Profile,
  Organization,
  OrganizationWithStats,
  Exam,
  Class,
  PaginatedResponse,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateExamInput,
  UpdateExamInput,
  ExamGenerationRequest,
  ExamSubmission,
} from '@eduator/core/types'

/**
 * Query Keys
 */
export const queryKeys = {
  // Profile
  profile: ['profile'] as const,
  
  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,
  
  // Users
  users: (filters?: Record<string, unknown>) => ['users', filters] as const,
  user: (id: string) => ['users', id] as const,
  pendingUsers: ['users', 'pending'] as const,
  
  // Exams
  exams: (filters?: Record<string, unknown>) => ['exams', filters] as const,
  exam: (id: string) => ['exams', id] as const,
  examSubmissions: (examId: string) => ['exams', examId, 'submissions'] as const,
  
  // Classes
  classes: (filters?: Record<string, unknown>) => ['classes', filters] as const,
  class: (id: string) => ['classes', id] as const,
  classStudents: (classId: string) => ['classes', classId, 'students'] as const,
  
  // Student
  availableExams: ['student', 'exams'] as const,
  studentProgress: ['student', 'progress'] as const,
  examHistory: ['student', 'exam-history'] as const,
  
  // Analytics
  platformAnalytics: ['analytics', 'platform'] as const,
  organizationAnalytics: ['analytics', 'organization'] as const,
  teacherAnalytics: ['analytics', 'teacher'] as const,
}

// ==================== Profile Hooks ====================

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const response = await apiClient.get<Profile>(profileEndpoints.me)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const response = await apiClient.put<Profile>(profileEndpoints.update, data)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

// ==================== Platform Owner Hooks ====================

export function useOrganizations(params?: { page?: number; perPage?: number; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.organizations, params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Organization>>(
        platformOwnerEndpoints.organizations.list,
        params as Record<string, string | number | boolean>
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organization(id),
    queryFn: async () => {
      const response = await apiClient.get<OrganizationWithStats>(
        platformOwnerEndpoints.organizations.get(id)
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateOrganizationInput) => {
      const response = await apiClient.post<Organization>(
        platformOwnerEndpoints.organizations.create,
        data
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrganizationInput }) => {
      const response = await apiClient.put<Organization>(
        platformOwnerEndpoints.organizations.update(id),
        data
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
      queryClient.invalidateQueries({ queryKey: queryKeys.organization(variables.id) })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(platformOwnerEndpoints.organizations.delete(id))
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
    },
  })
}

// ==================== User Management Hooks ====================

export function usePlatformUsers(params?: { page?: number; perPage?: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Profile>>(
        platformOwnerEndpoints.users.list,
        params as Record<string, string | number | boolean>
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useApproveUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.patch<Profile>(
        platformOwnerEndpoints.users.approve(userId)
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useRejectUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const response = await apiClient.patch<Profile>(
        platformOwnerEndpoints.users.reject(userId),
        { reason }
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// ==================== Teacher Hooks ====================

export function useTeacherExams(params?: { page?: number; perPage?: number; classId?: string }) {
  return useQuery({
    queryKey: queryKeys.exams(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Exam>>(
        teacherEndpoints.exams.list,
        params as Record<string, string | number | boolean>
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useExam(id: string) {
  return useQuery({
    queryKey: queryKeys.exam(id),
    queryFn: async () => {
      const response = await apiClient.get<Exam>(teacherEndpoints.exams.get(id))
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateExamInput) => {
      const response = await apiClient.post<Exam>(teacherEndpoints.exams.create, data)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

export function useGenerateExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: ExamGenerationRequest) => {
      const response = await apiClient.post<Exam>(teacherEndpoints.exams.generate, data)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

export function useUpdateExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExamInput }) => {
      const response = await apiClient.put<Exam>(teacherEndpoints.exams.update(id), data)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.exam(variables.id) })
    },
  })
}

export function useDeleteExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(teacherEndpoints.exams.delete(id))
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

export function usePublishExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Exam>(teacherEndpoints.exams.publish(id))
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.exam(id) })
    },
  })
}

// ==================== Class Hooks ====================

export function useTeacherClasses() {
  return useQuery({
    queryKey: queryKeys.classes(),
    queryFn: async () => {
      const response = await apiClient.get<Class[]>(teacherEndpoints.classes.list)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useClass(id: string) {
  return useQuery({
    queryKey: queryKeys.class(id),
    queryFn: async () => {
      const response = await apiClient.get<Class>(teacherEndpoints.classes.get(id))
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    enabled: !!id,
  })
}

// ==================== Student Hooks ====================

export function useAvailableExams() {
  return useQuery({
    queryKey: queryKeys.availableExams,
    queryFn: async () => {
      const response = await apiClient.get<Exam[]>(studentEndpoints.exams.available)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useSubmitExam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ examId, answers, timeSpent }: { examId: string; answers: Array<{ question_id: string; answer: string | string[] }>; timeSpent: number }) => {
      const response = await apiClient.post<ExamSubmission>(
        studentEndpoints.exams.submit(examId),
        { answers, time_spent_seconds: timeSpent }
      )
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availableExams })
      queryClient.invalidateQueries({ queryKey: queryKeys.examHistory })
    },
  })
}

export function useStudentProgress() {
  return useQuery({
    queryKey: queryKeys.studentProgress,
    queryFn: async () => {
      const response = await apiClient.get(studentEndpoints.progress.overview)
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
  })
}

export function useJoinClass() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (classCode: string) => {
      const response = await apiClient.post(studentEndpoints.classes.join, { code: classCode })
      if (!isSuccess(response)) throw new Error(response.error?.message)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}
