# Translations (i18n)

Messages are split by route module. Edit the JSON files in each folder:

- **public/** — Landing, auth, about, pricing (en.json, az.json, ru.json)
- **teacher/** — Teacher dashboard and tools
- **student/** — Student settings
- **platform-owner/** — Platform owner dashboard
- **school-admin/** — School admin dashboard

The app loads only the module for the current path (see `src/i18n/module-mapping.ts`).
