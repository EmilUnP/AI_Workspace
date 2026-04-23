const sharedPublicEnv = {
  // Public URLs consumed by Next.js apps at build/runtime
  NEXT_PUBLIC_ERP_URL: 'https://erp.eduator.ai',
  // Legacy fallback kept for compatibility with older code paths
  NEXT_PUBLIC_APP_URL: 'https://erp.eduator.ai',
  NEXT_PUBLIC_MARKETING_URL: 'https://eduator.ai',
  NEXT_PUBLIC_API_URL: 'https://api.eduator.ai',
}

module.exports = {
  apps: [
    {
      name: 'edu-api',
      script: 'npm',
      args: 'run start -w @eduator/api-server',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...sharedPublicEnv,
      },
    },
    {
      name: 'edu-erp',
      script: 'npm',
      args: 'run start -w erp-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        ...sharedPublicEnv,
      },
    },
    {
      name: 'edu-marketing',
      script: 'npm',
      args: 'run start -w marketing-site',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...sharedPublicEnv,
      },
    },
  ],
}
