const path = require('path')
const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  transpilePackages: ['@eduator/ui'],
  webpack: (config) => {
    // Resolve workspace packages from monorepo root (Next runs from apps/marketing-site)
    const monorepoRoot = path.resolve(__dirname, '../..')
    config.resolve.modules = [path.join(monorepoRoot, 'node_modules'), ...(config.resolve.modules || [])]
    return config
  },
}

module.exports = withNextIntl(nextConfig)

