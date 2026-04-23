# Translations (i18n)

Messages are split by route module. Edit the JSON files in each folder:

- **public/** — Landing and auth (en.json, az.json)
- **teacher/** — Teacher dashboard and tools
- **platform-owner/** — Platform owner dashboard
- **school-admin/** — School admin dashboard

The app loads only the module for the current path (see `src/i18n/module-mapping.ts`).
