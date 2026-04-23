/**
 * Type declaration for @fastify/compress until npm install is run.
 * The package is listed in package.json; run `npm install` from repo root to install it.
 */
declare module '@fastify/compress' {
  import type { FastifyPluginAsync } from 'fastify'
  interface FastifyCompressOptions {
    encodings?: string[]
  }
  const compress: FastifyPluginAsync<FastifyCompressOptions>
  export default compress
}
