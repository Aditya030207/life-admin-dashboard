# Portfolio release checklist

Target final review: **October 16, 2026 (Asia/Kolkata)**. Documentation can be prepared before that date; preparation does not claim the final release is complete.

## Candidate review — October 15

- [x] Describe implemented features, browser-local limits and AI assistance accurately.
- [x] Add architecture, usage, demo and honest resume notes.
- [x] Review backup compatibility for generated reminder titles; add boundary regression coverage.
- [x] Clean install, lint, 29 unit tests, production build and all 19 Chrome tests passed.

Remote CI runs on every push; confirm its result for the candidate revision before the final release.

## Final review — October 16

- [ ] Fetch remote history and confirm no other writer/unrelated changes.
- [ ] Check final candidate CI and any newly reported issues.
- [ ] Review desktop/mobile screenshots against the current UI.
- [ ] Check tracked files for accidental secrets or personal data; use only fictional demo data.
- [ ] Confirm README setup and portfolio/demo links work.
- [ ] Record final verification and remaining limitations in PROGRESS.md.
- [ ] Mark the release complete only after these checks; tag only the verified revision if creating a release.
- [ ] Pause the seven-day automation when finished. Do not create filler changes for unused work windows.

No external deployment, hosted URL, encryption or full accessibility audit is claimed. MIT covers this project's source; dependencies retain their own licenses.
