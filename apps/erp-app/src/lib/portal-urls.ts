const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

export const getApiUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')

export const getMarketingUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000')
