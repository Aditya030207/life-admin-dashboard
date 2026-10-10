# Seven days of genuine development

October 10–16, 2026 · Asia/Kolkata (IST)

Six work windows: **08:15, 10:15, 13:15, 15:15, 20:15, 22:15 IST**. Morning and elapsed windows on October 10 are not recreated. A window is an opportunity for a focused task, not a promise of a commit. Skip completed work; do not pad history, backdate timestamps, or commit merely to meet a quota. Finish and verify one coherent improvement before committing it. Scheduled work depends on the local app and checkout being available.

| Day        | Milestone                   | Useful work in morning / afternoon / evening                                                                             |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1 · Oct 10 | Working local MVP           | Domain and storage / dashboard and CRUD / tests, README and CI                                                           |
| 2 · Oct 11 | Backup and recovery         | Versioned export format / validated import including attachments / recovery and round-trip tests                         |
| 3 · Oct 12 | Recurring renewals          | Recurrence model / mark paid and generate next occurrence / month-end and leap-year tests                                |
| 4 · Oct 13 | Calendar and contacts       | Month navigation / due-date calendar and contact-specific fields / filter and mobile checks                              |
| 5 · Oct 14 | Accessibility and usability | Keyboard audit / accessible detail dialog and focus restoration / empty/error state improvements                         |
| 6 · Oct 15 | Reliability                 | Storage migration/version handling / multi-tab conflict handling / regression suite and file limits                      |
| 7 · Oct 16 | Portfolio release           | Fix remaining verified issues / final screenshots and architecture notes / release checklist and accurate resume bullets |

## Rules for every scheduled session

1. Read this plan and `docs/PROGRESS.md`, inspect the working tree and remote history, and choose an unfinished task appropriate to today's milestone.
2. Preserve unrelated changes. Never run multiple writers on this checkout. If another session is active, skip this window.
3. Implement a meaningful bounded improvement and its relevant validation. Run `npm test`, `npm run build`, and relevant browser tests before pushing.
4. Use actual commit timestamps and plain descriptive messages. Do not split one change into artificial commits or touch files solely to create activity.
5. Update the progress log with actual work, evidence, and remaining limitations. Push only passing changes to the existing repository.
6. Stay quiet if nothing actionable changed; report meaningful milestones or blockers.
7. At the end of October 16 (or on any later wake), pause this automation with the automation tool and do no further development without a new request.

Core CRUD is available on day one. Later milestones improve it; this plan is not a claim that future work is already complete.
