/**
 * First-party Next.js → clean-backend requests send this header so the API can
 * skip `api_access_log` rows (normal UI traffic vs integration / scripts).
 * External clients must not send this value unless they intentionally opt out of usage stats.
 */
export const EDUATOR_WEB_CLIENT_HEADER = 'X-Eduator-Client'
export const EDUATOR_WEB_CLIENT_VALUE = 'web-app'

export const webAppBackendAuthHeaders = (accessToken: string): Record<string, string> => ({
  Authorization: `Bearer ${accessToken}`,
  [EDUATOR_WEB_CLIENT_HEADER]: EDUATOR_WEB_CLIENT_VALUE,
})
