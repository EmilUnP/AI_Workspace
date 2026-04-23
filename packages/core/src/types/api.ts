/**
 * API Request/Response Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ApiMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  stack?: string
}

export interface ApiMeta {
  page?: number
  per_page?: number
  total?: number
  total_pages?: number
  request_id?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface PaginationParams {
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SearchParams extends PaginationParams {
  query?: string
  filters?: Record<string, unknown>
}

/**
 * HTTP Client Types
 */
export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  timeout?: number
  signal?: AbortSignal
}

export interface HttpClientConfig {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
  onRequest?: (config: RequestConfig) => RequestConfig
  onResponse?: <T>(response: ApiResponse<T>) => ApiResponse<T>
  onError?: (error: ApiError) => void
}

/**
 * Auth API Types
 */
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
  }
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

export interface SignupRequest {
  email: string
  password: string
  full_name: string
  profile_type: string
  organization_id?: string
}

export interface SignupResponse {
  user: {
    id: string
    email: string
  }
  message: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

/**
 * File Upload Types
 */
export interface FileUploadRequest {
  file: File
  path?: string
  bucket?: string
}

export interface FileUploadResponse {
  url: string
  path: string
  size: number
  mime_type: string
}

/**
 * Webhook Types
 */
export interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
  signature: string
}

export interface WebhookConfig {
  url: string
  events: string[]
  secret: string
  is_active: boolean
}
