# Global rules:

- i18n: make sure that any new string is i18n-ized, and complete `translations.ts` for all existing languages

- When testing changes:
  - Assume `npm run dev` is already running, do not run the server unless told otherwise.
  - If no data is loaded, load demo data with "Load sample data" button (do not import file). If data is already loaded, use it (do not reload page, do not use new tab)
