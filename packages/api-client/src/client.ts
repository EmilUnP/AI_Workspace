import type { ApiResponse, ApiError, RequestConfig } from '@eduator/core/types/api'

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  getAccessToken?: () => Promise<string | null>
  onError?: (error: ApiError) => void
  onUnauthorized?: () => void
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

function getDefaultApiBaseUrl(): string {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
}

/**
 * Default configuration
 */
const defaultConfig: ApiClientConfig = {
  baseUrl: getDefaultApiBaseUrl(),
  timeout: 30000,
}

let globalConfig: ApiClientConfig = { ...defaultConfig }

/**
 * Configure the API client
 */
export function configureApiClient(config: Partial<ApiClientConfig>) {
  globalConfig = { ...globalConfig, ...config }
}

/**
 * Get the current configuration
 */
export function getApiConfig(): ApiClientConfig {
  return globalConfig
}

/**
 * Build the full URL for an endpoint
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
  const baseUrl = globalConfig.baseUrl || defaultConfig.baseUrl
  let url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  return url
}

/**
 * Make an API request
 */
async function request<T>(
  method: string,
  endpoint: string,
  options?: {
    body?: unknown
    params?: Record<string, string | number | boolean>
    headers?: Record<string, string>
    config?: RequestConfig
  }
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params)

  // Get access token if available
  let authHeader: string | undefined
  if (globalConfig.getAccessToken) {
    const token = await globalConfig.getAccessToken()
    if (token) {
      authHeader = `Bearer ${token}`
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  try {
    const controller = new AbortController()
    const timeout = globalConfig.timeout || defaultConfig.timeout || 30000

    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.config?.signal || controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse response
    let data: unknown
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // Handle error responses
    if (!response.ok) {
      const error: ApiError = {
        code: String(response.status),
        message: (data as { message?: string })?.message || response.statusText,
        details: data as Record<string, unknown>,
      }

      // Handle 401 Unauthorized
      if (response.status === 401 && globalConfig.onUnauthorized) {
        globalConfig.onUnauthorized()
      }

      // Call error handler if configured
      if (globalConfig.onError) {
        globalConfig.onError(error)
      }

      return { success: false, error }
    }

    // Success response
    return {
      success: true,
      data: data as T,
    }
  } catch (err) {
    const error: ApiError = {
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network request failed',
    }

    if (globalConfig.onError) {
      globalConfig.onError(error)
    }

    return { success: false, error }
  }
}

/**
 * API Client with type-safe methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return request<T>('GET', endpoint, { params, config })
  },

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return request<T>('POST', endpoint, { body, config })
  },

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return request<T>('PUT', endpoint, { body, config })
  },

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return request<T>('PATCH', endpoint, { body, config })
  },

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return request<T>('DELETE', endpoint, { config })
  },

  /**
   * Upload file
   */
  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = buildUrl(endpoint)

    let authHeader: string | undefined
    if (globalConfig.getAccessToken) {
      const token = await globalConfig.getAccessToken()
      if (token) {
        authHeader = `Bearer ${token}`
      }
    }

    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const headers: Record<string, string> = {}
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message: data.message || response.statusText,
          },
        }
      }

      return { success: true, data }
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err instanceof Error ? err.message : 'File upload failed',
        },
      }
    }
  },
}

/**
 * Helper to check if response was successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is { success: true; data: T } {
  return response.success === true
}

/**
 * Helper to check if response was an error
 */
export function isError<T>(response: ApiResponse<T>): response is { success: false; error: ApiError } {
  return response.success === false
}
