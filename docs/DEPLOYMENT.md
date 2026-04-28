# Deployment (Minimal)

## Apps

- Web app deployment target
- API server deployment target

## Required Environment

- Supabase URL and anon key
- Service role key for server-side admin operations
- AI provider key (if AI features are enabled)
- Public app URLs for Web/API routing

## Build Commands

```bash
npm run build:apps
```

## Validation

- Confirm Web app routes build
- Confirm auth callback/login flow works
