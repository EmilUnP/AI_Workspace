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
  // Organizations
  organizations: {
    list: `${BASE}/platform-owner/organizations`,
    create: `${BASE}/platform-owner/organizations`,
    get: (id: string) => `${BASE}/platform-owner/organizations/${id}`,
    update: (id: string) => `${BASE}/platform-owner/organizations/${id}`,
    delete: (id: string) => `${BASE}/platform-owner/organizations/${id}`,
  },
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
  // Classes
  classes: {
    list: `${BASE}/school-admin/classes`,
    get: (id: string) => `${BASE}/school-admin/classes/${id}`,
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
  // Classes
  classes: {
    list: `${BASE}/teacher/classes`,
    create: `${BASE}/teacher/classes`,
    get: (id: string) => `${BASE}/teacher/classes/${id}`,
    update: (id: string) => `${BASE}/teacher/classes/${id}`,
    delete: (id: string) => `${BASE}/teacher/classes/${id}`,
    learners: (id: string) => `${BASE}/teacher/classes/${id}/students`,
    addLearner: (id: string) => `${BASE}/teacher/classes/${id}/students`,
    removeLearner: (classId: string, learnerId: string) =>
      `${BASE}/teacher/classes/${classId}/students/${learnerId}`,
    // Deprecated aliases
    students: (id: string) => `${BASE}/teacher/classes/${id}/students`,
    addStudent: (id: string) => `${BASE}/teacher/classes/${id}/students`,
    removeStudent: (classId: string, studentId: string) =>
      `${BASE}/teacher/classes/${classId}/students/${studentId}`,
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
  // Classes
  classes: {
    list: `${BASE}/student/classes`,
    join: `${BASE}/student/classes/join`,
    leave: (id: string) => `${BASE}/student/classes/${id}/leave`,
  },
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
