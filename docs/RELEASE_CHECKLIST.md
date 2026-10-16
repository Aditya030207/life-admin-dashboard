# Portfolio release checklist

Final review: **October 16, 2026 (Asia/Kolkata)**. Version 1.0.0 portfolio release payload verified locally; publication is gated on passing CI for the exact release commit.

## Candidate review — October 15

- [x] Describe implemented features, browser-local limits and AI assistance accurately.
- [x] Add architecture, usage, demo and honest resume notes.
- [x] Review backup compatibility for generated reminder titles; add boundary regression coverage.
- [x] Clean install, lint, 29 unit tests, production build and all 19 Chrome tests passed.

Remote CI runs on every push; confirm its result for the candidate revision before the final release.

## Final review — October 16

- [x] Fetch remote history and confirm no other writer/unrelated changes.
- [x] Check final candidate CI and any newly reported issues.
- [x] Review desktop/mobile screenshots against the current UI.
- [x] Check tracked files for accidental secrets or personal data; use only fictional demo data.
- [x] Confirm README setup and portfolio/demo links work.
- [x] Record final verification and remaining limitations in PROGRESS.md.
- [x] Prepare version 1.0.0, release notes and final progress evidence.

Publication procedure: push this payload, confirm CI for its exact commit, then create `v1.0.0` and its GitHub release. Shut down the seven-day automation after successful publication; the completion notification records that action. Do not create filler changes for unused windows.

No external deployment, hosted URL, encryption or full accessibility audit is claimed. MIT covers this project's source; dependencies retain their own licenses.
