const path = require('path')
const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  // NOTE: Keep default output file tracing settings for local/server deployments.
  transpilePackages: [
    '@eduator/ai',
    '@eduator/api-client',
    '@eduator/auth',
    '@eduator/config',
    '@eduator/core',
    '@eduator/db',
    '@eduator/ui',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    // Allow document uploads up to 15MB (middleware buffers body; default is 10MB)
    middlewareClientMaxBodySize: '20mb',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/teacher',
        destination: '/school-admin',
        permanent: false,
      },
      {
        source: '/teacher/:path*',
        destination: '/school-admin/:path*',
        permanent: false,
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Resolve workspace packages from monorepo root (Next runs from apps/web-app and may not find them)
    const monorepoRoot = path.resolve(__dirname, '../..')
    config.resolve.modules = [path.join(monorepoRoot, 'node_modules'), ...(config.resolve.modules || [])]
    if (isServer) {
      // Handle CommonJS modules like pdf-parse
      // Mark pdf-parse packages as externals to prevent webpack from bundling them
      const originalExternals = config.externals || []
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        '@cedrugs/pdf-parse',
        'pdf-parse',
      ]
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
}

module.exports = withNextIntl(nextConfig)
