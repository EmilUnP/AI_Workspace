# Eduator AI Workspace

Minimal, reset documentation for the current product baseline.

## Current Scope

- ERP app (`apps/erp-app`)
- Marketing site (`apps/marketing-site`)
- API server and shared packages (`packages/*`)
- SaaS app is removed
- Student portal UI is removed and blocked

## Quick Start

```bash
npm install
npm run dev:api
npm run dev:erp
npm run dev:marketing
```

## Main Scripts

- `npm run dev:all` - Start API, ERP, and marketing together
- `npm run build:apps` - Build ERP and marketing
- `npm run lint` - Lint workspace
- `npm run type-check` - TypeScript check

## Documentation

- `docs/DOCUMENTATION_INDEX.md`
- `docs/FEATURES.md`
- `docs/TECHNICAL.md`
- `docs/API.md`
- `docs/DEPLOYMENT.md`
- `docs/ROADMAP.md`
