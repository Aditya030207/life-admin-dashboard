# Portfolio and interview notes

**Life Admin Dashboard** — React, TypeScript, Vite, Zod, IndexedDB, Vitest, Playwright.

## Resume bullets

- Built a responsive personal-administration dashboard with CRUD for seven record types, categories, linked reminders and file attachments, plus a monthly attention queue and due-date calendar.
- Implemented monthly/yearly renewal logic preserving month-end and leap-day intent, with duplicate-successor prevention and tested date boundaries.
- Added validated JSON backup/restore including attachment bytes, transactional IndexedDB persistence, legacy migration and revision-based rejection of stale tab writes.
- Verified domain, persistence and backup behavior with unit tests and real Chrome workflows covering recovery, keyboard dialogs and responsive layouts.

Pick two or three bullets appropriate to the role and describe only work you understand. Do not claim users, measured business impact, cloud hosting, security certification or production readiness. This project was developed with AI assistance.

## Be ready to explain

- **Why IndexedDB?** It stores structured data and Blobs locally without a backend. The tradeoff is origin/device-bound data and possible clearing/eviction; backups are manual.
- **Why a snapshot?** It keeps related changes atomic in a small app. Whole-workspace validation/writes cost more as data grows. Separate stores and incremental updates are the next scaling step.
- **Why revision checks?** A read/check/write in one transaction prevents an older tab overwriting a newer snapshot. It rejects conflicts rather than merging drafts.
- **Why date-only arithmetic?** A bill due on a calendar date should not move across timezones. Anchors preserve the original renewal day when a short month requires clamping.
- **Why validate export too?** A download is useful only if restore can accept it. Shared limits and relationship checks prevent newly generated invalid backups.
- **What comes next?** Component extraction, more browser/assistive-technology coverage and, if real users need it, a backend with authentication, authorization, encrypted storage and a defined sync model. These are future work.

See [architecture](ARCHITECTURE.md) for implementation boundaries and [demo](DEMO.md) for a concrete walkthrough. Keep test totals and release claims tied to the progress log and CI for the current revision.
