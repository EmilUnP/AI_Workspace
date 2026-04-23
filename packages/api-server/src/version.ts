/**
 * Product version exposed by the API (health, Swagger, GET /api/v1).
 * Use env overrides for deployment, otherwise default to this package version.
 */
export const API_VERSION = process.env.API_VERSION || process.env.npm_package_version || '0.0.5'
export const APP_VERSION = process.env.APP_VERSION || '0.0.8'
