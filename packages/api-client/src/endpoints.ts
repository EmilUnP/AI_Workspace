import { API_BASE_PATH } from '@eduator/config'

/**
 * API Endpoint builders for type-safe API calls
 */

// Base path
const BASE = API_BASE_PATH

/**
 * Authentication endpoints
 */
export const authEndpoints = {
  login: `${BASE}/auth/login`,
  signup: `${BASE}/auth/signup`,
  logout: `${BASE}/auth/logout`,
  refresh: `${BASE}/auth/refresh`,
  forgotPassword: `${BASE}/auth/forgot-password`,
  resetPassword: `${BASE}/auth/reset-password`,
  verifyEmail: `${BASE}/auth/verify-email`,
}

/**
 * Profile endpoints
 */
export const profileEndpoints = {
  me: `${BASE}/profile`,
  update: `${BASE}/profile`,
  avatar: `${BASE}/profile/avatar`,
}

/**
 * Platform Owner endpoints
 */
export const platformOwnerEndpoints = {
  // Users
  users: {
    list: `${BASE}/platform-owner/users`,
    get: (id: string) => `${BASE}/platform-owner/users/${id}`,
    approve: (id: string) => `${BASE}/platform-owner/users/${id}/approve`,
    reject: (id: string) => `${BASE}/platform-owner/users/${id}/reject`,
    suspend: (id: string) => `${BASE}/platform-owner/users/${id}/suspend`,
    delete: (id: string) => `${BASE}/platform-owner/users/${id}`,
  },
  // Reports
  reports: {
    dashboard: `${BASE}/platform-owner/reports`,
    analytics: `${BASE}/platform-owner/reports/analytics`,
    usage: `${BASE}/platform-owner/reports/usage`,
  },
}

/**
 * School Admin endpoints
 */
export const schoolAdminEndpoints = {
  // Dashboard
  dashboard: `${BASE}/school-admin/dashboard`,
  // Users
  users: {
    list: `${BASE}/school-admin/users`,
    create: `${BASE}/school-admin/users`,
    get: (id: string) => `${BASE}/school-admin/users/${id}`,
    update: (id: string) => `${BASE}/school-admin/users/${id}`,
    delete: (id: string) => `${BASE}/school-admin/users/${id}`,
    approve: (id: string) => `${BASE}/school-admin/users/${id}/approve`,
    reject: (id: string) => `${BASE}/school-admin/users/${id}/reject`,
  },
  // Reports
  reports: {
    overview: `${BASE}/school-admin/reports`,
    teachers: `${BASE}/school-admin/reports/teachers`,
    learners: `${BASE}/school-admin/reports/students`,
    // Deprecated alias kept for compatibility.
    students: `${BASE}/school-admin/reports/students`,
  },
}

/**
 * School-admin teaching endpoints (legacy `/teacher/*` paths).
 */
export const schoolAdminTeachingEndpoints = {
  // Dashboard
  dashboard: `${BASE}/teacher/dashboard`,
  // Exams
  exams: {
    list: `${BASE}/teacher/exams`,
    create: `${BASE}/teacher/exams`,
    generate: `${BASE}/teacher/exams/generate`,
    get: (id: string) => `${BASE}/teacher/exams/${id}`,
    update: (id: string) => `${BASE}/teacher/exams/${id}`,
    delete: (id: string) => `${BASE}/teacher/exams/${id}`,
    publish: (id: string) => `${BASE}/teacher/exams/${id}/publish`,
    unpublish: (id: string) => `${BASE}/teacher/exams/${id}/unpublish`,
    submissions: (id: string) => `${BASE}/teacher/exams/${id}/submissions`,
  },
  // Lessons
  lessons: {
    list: `${BASE}/teacher/lessons`,
    create: `${BASE}/teacher/lessons`,
    generate: `${BASE}/teacher/lessons/generate`,
    get: (id: string) => `${BASE}/teacher/lessons/${id}`,
    update: (id: string) => `${BASE}/teacher/lessons/${id}`,
    delete: (id: string) => `${BASE}/teacher/lessons/${id}`,
  },
  // Analytics
  analytics: {
    overview: `${BASE}/teacher/analytics`,
    class: (classId: string) => `${BASE}/teacher/analytics/class/${classId}`,
    exam: (examId: string) => `${BASE}/teacher/analytics/exam/${examId}`,
  },
}
/** @deprecated Use schoolAdminTeachingEndpoints */
export const teacherEndpoints = schoolAdminTeachingEndpoints

/**
 * Learner endpoints
 *
 * NOTE: These routes are legacy-compatible and may map to old `/student/*` API paths
 * where backend migration is still in progress.
 */
export const learnerEndpoints = {
  // Dashboard
  dashboard: `${BASE}/student/dashboard`,
  // Exams
  exams: {
    available: `${BASE}/student/exams`,
    get: (id: string) => `${BASE}/student/exams/${id}`,
    start: (id: string) => `${BASE}/student/exams/${id}/start`,
    submit: (id: string) => `${BASE}/student/exams/${id}/submit`,
    result: (id: string) => `${BASE}/student/exams/${id}/result`,
    history: `${BASE}/student/exams/history`,
  },
  // Lessons
  lessons: {
    list: `${BASE}/student/lessons`,
    get: (id: string) => `${BASE}/student/lessons/${id}`,
    progress: (id: string) => `${BASE}/student/lessons/${id}/progress`,
  },
  // Chatbot
  chatbot: {
    send: `${BASE}/student/chatbot`,
    history: `${BASE}/student/chatbot/history`,
    conversation: (id: string) => `${BASE}/student/chatbot/conversation/${id}`,
  },
  // Progress
  progress: {
    overview: `${BASE}/student/progress`,
    subject: (subject: string) => `${BASE}/student/progress/${subject}`,
  },
}

/**
 * Public endpoints (no auth required)
 */
export const publicEndpoints = {
  health: `${BASE}/health`,
  docs: `${BASE}/docs`,
}
