const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

export const getAppUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_ERP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')

export const getErpUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_ERP_URL || 'http://localhost:3001')

export const getApiUrl = (): string =>
  trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')

