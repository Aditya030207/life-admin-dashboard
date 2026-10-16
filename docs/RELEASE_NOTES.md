# Life Admin Dashboard 1.0.0

A browser-local portfolio MVP for managing insurance, subscriptions, documents, renewals, bills, appointments and important contacts.

- Monthly attention dashboard, record/category CRUD, linked reminders and downloadable attachments.
- Due-date calendar, structured contacts and monthly/yearly renewals with month-end/leap-day handling.
- Validated portable backup/restore including attachment bytes, transactional storage migration and stale-tab conflict rejection.
- Responsive layouts, native modal keyboard behavior, fictional seed data and reviewer/architecture/resume guides.

## Verification

29 unit tests, 19 Chrome browser scenarios, lint and a TypeScript production build. CI repeats verification on pushes. Browser checks block Google Fonts and exercise the supported system-font fallback; screenshots contain fictional demo data.

## Scope and limits

Data stays in IndexedDB for this browser/origin. There is no backend, authentication, encryption, cross-device sync, payment processing or external notification delivery. Backups are unencrypted. Attachment checks are client-side convenience checks, not malware scanning. Chrome keyboard coverage is not a full accessibility or cross-browser audit. No hosted deployment, adoption metrics or production readiness is claimed.

Built with React, TypeScript, Vite, Zod and IndexedDB, with AI assistance. Source is MIT licensed; dependencies keep their own licenses. See README.md and docs/PROGRESS.md for setup and actual development history.
