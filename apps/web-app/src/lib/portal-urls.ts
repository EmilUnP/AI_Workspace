const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

/** Base URL for the Eduator API (`NEXT_PUBLIC_API_URL`). */
export const getApiUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
