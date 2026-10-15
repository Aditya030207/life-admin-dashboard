# Life Admin Dashboard

**A little less on your mind.** A small, polished personal dashboard for the bills, renewals, documents and appointments that are easy to lose track of.

![Life Admin dashboard](docs/dashboard.png)

## What it does

- **What needs attention this month:** unfinished records due through the end of the current local month, including older overdue items, sorted by date.
- Create, read, update and delete insurance, subscription, document, renewal, bill, appointment and contact records.
- Calendar view with Monday-first weeks, month navigation, type filtering, completed-record visibility and a daily agenda that opens record details.
- Monthly and yearly recurrence: completing an occurrence creates one next renewal, preserving month-end and leap-day intent.
- Contact records support separate email, phone and organization fields; search includes these fields and existing contact details.
- Search by title, notes or category; filter by record type; mark items complete and reopen them.
- Add, rename and delete categories. Renaming updates associated records; nonempty categories cannot be deleted.
- Create, edit, complete and delete reminders linked to records.
- Upload, rename, download and delete attachments (PDF, PNG, JPEG and text; 5 MB each).
- Export a versioned JSON backup containing all records, categories, reminders and base64-encoded attachment bytes. The backup is unencrypted; keep it somewhere safe. Restore validates the snapshot and asks before replacing your workspace.
- Records, reminders and attachment blobs persist in IndexedDB across page reloads. Deleting a record also deletes its linked reminders and files.
- Responsive UI, labelled forms, input constraints and schema validation, with fictional demo data relative to the current month.

## Run locally

Requires Node.js 22.12+ (Node 24 LTS recommended).

```sh
git clone https://github.com/Aditya030207/life-admin-dashboard.git
cd life-admin-dashboard
npm ci
npm run dev
```

Open the local URL printed by Vite. No API keys, account setup or environment variables are needed.

```sh
npm test        # date boundaries, validation, cascade deletion, persistence
npm run build  # TypeScript check and production build
npm run test:e2e
```

Browser tests use Google Chrome; install Chrome locally, or run `npx playwright install chrome`. CI installs Chrome before running the tests. `npm run preview` serves the production build locally.

## Stack and structure

React + TypeScript, Vite, Zod, IndexedDB via `idb`, Lucide icons, Vitest and Playwright. Styling uses plain CSS so the layout is easy to inspect and customize.

```text
src/domain.ts       Data types, validation, date calculations, demo data
src/storage.ts      IndexedDB persistence
src/backup.ts       Versioned backup export/import with portable attachment bytes
src/attachments.ts Shared upload and backup file limits
src/recurrence.ts   Calendar-safe renewals and completion transitions
src/calendar.ts     Date-only month arithmetic and week layout
src/CalendarView.tsx Calendar navigation, filters and daily agenda
src/useModalDialog.ts Native modal focus management
src/App.tsx         Dashboard, record editor and management views
src/App.css         Responsive layouts and component styles
src/index.css       Typography and global styles
tests/             Domain/storage tests and browser flows
 docs/              Screenshots, development plan and progress
```

The app saves a single snapshot transactionally. UI state updates only after the write succeeds, so a failed write does not pretend to have persisted data. This intentionally simple design suits a small single-user portfolio app; each save compares the loaded revision in the same IndexedDB transaction, rejecting stale snapshots from another tab. A larger version should use individual object stores and finer-grained conflict resolution.

## Honest limitations

This is a **browser-local portfolio MVP**, not a production document vault or financial service. There is no backend, authentication, encryption, cross-device sync, email/push notification delivery, payment processing or automatic recurring billing. Reminders are visible only inside the app. Amounts use INR; contacts support optional email, phone and organization fields alongside free-text details.

Data belongs to this browser and origin. Clearing site data removes it. Use fictional/demo information: backup export/restore, legacy snapshot migration and multi-tab conflict rejection are available. File checks are client-side convenience checks, not a malware scanner. Downloaded attachments are not rendered as HTML. Google Fonts is the only external UI resource; system fonts are used if it is unavailable.

## Reviewer guide

Start with the [five-minute demo](docs/DEMO.md), then read the [architecture](docs/ARCHITECTURE.md) and [usage guide](docs/USAGE.md). [Portfolio notes](docs/PORTFOLIO.md) include accurate resume bullets and design tradeoffs.

The project is preparing for its October 16 release. See the [release checklist](docs/RELEASE_CHECKLIST.md), [seven-day plan](docs/DEVELOPMENT_PLAN.md) and [actual progress](docs/PROGRESS.md). Work windows are opportunities for useful changes, not commit quotas; commits use actual timestamps.

Developed with AI assistance. Understand and review the implementation before discussing it in interviews. No adoption or performance metrics are claimed without measurement.

## License

[MIT](LICENSE). Dependency licenses remain with their respective authors.
