# Deployment (Minimal)

## Apps

- ERP app deployment target
- Marketing site deployment target
- API server deployment target

## Required Environment

- Supabase URL and anon key
- Service role key for server-side admin operations
- AI provider key (if AI features are enabled)
- Public app URLs for ERP/API/marketing routing

## Build Commands

```bash
npm run build:apps
```

## Validation

- Confirm ERP app routes build
- Confirm marketing app routes build
- Confirm auth callback/login flow works
