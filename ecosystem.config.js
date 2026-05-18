const sharedPublicEnv = {
  // Public URLs consumed by Next.js at build/runtime
  NEXT_PUBLIC_ERP_URL: 'https://eduator.ai',
  NEXT_PUBLIC_API_URL: 'https://api.eduator.ai',
}

module.exports = {
  apps: [
    {
      name: 'edu-api',
      cwd: './apps/backend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...sharedPublicEnv,
      },
    },
    {
      name: 'edu-web',
      cwd: './apps/web-app',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...sharedPublicEnv,
      },
    },
  ],
}
