/**
 * Agent logger: verbose logs only in development to reduce overhead in production.
 */
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
}
