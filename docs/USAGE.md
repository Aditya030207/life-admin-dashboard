# Using Life Admin Dashboard

## Backup and restore

Use **Export backup** at the bottom of the dashboard to download your workspace. Use **Restore backup** to select that JSON file. Restore replaces all existing data after confirmation; export your current workspace first if you want to keep it. Invalid backups never reach storage. Import supports version 1 snapshots up to 100 MB, with up to 10,000 records/reminders, 1,000 categories/files and 5 MB per attachment. Files must be PDF, PNG, JPEG or plain text. Backups contain readable personal information and are not encrypted.

## Recurring records

Choose **Monthly** or **Yearly** in the record editor, with a due date. **Complete & renew** marks the current record complete and creates the next open occurrence. Dates advance from the previous due date, even when overdue. January 31 becomes February 28/29 and then March 31; February 29 annual renewals return to February 29 in leap years.

Completed history stays available. Reopening/recompleting a record never generates another successor, even if that successor was later deleted. Edit the next occurrence to change future recurrence, or delete it to stop the chain. Files and reminders stay linked to their original occurrence and are not copied automatically. This is renewal bookkeeping; the app does not make payments. Existing local data and version 1 backups without recurrence fields remain supported.

## Calendar

Open **Calendar** in the sidebar. Navigate with Previous/Next month or return with Today. Select any day to see its due records and open one to edit or complete it. Use the type filter or Include completed to adjust the view. The calendar uses Monday-first weeks and date-only due dates, so records do not shift days when viewed in a different time zone. Records without a due date remain in All records. This is a due-date calendar, not appointment-time scheduling.

## Important contacts

Select **Contact** in the record editor to add an email address, phone number and organization. These fields are optional, searchable, editable and included in backups. Existing contact-details text is preserved without attempting to infer email or phone fields. Email checks validate format only; phone numbers are stored as display text (up to 60 characters), preserving country codes and extensions without claiming number verification. The app does not send messages or dial numbers.

## Keyboard dialogs

Record details and the record editor use named native modal dialogs. Background controls cannot receive focus while a modal is open. Escape closes the top dialog; closing the editor returns to its Edit button, and closing details returns to its record opener. If that opener was deleted, focus returns to the page heading. Explicit Close buttons remain available for touch users. These behaviors are regression-tested in Chrome; they are not a claim of a complete screen-reader or cross-browser accessibility audit.

## Calendar keyboard controls and recovery

Tab enters the calendar on the selected day, with one day in the tab sequence. Arrow keys move by day/week; Home and End select the first/last day of the Monday-first week. Page Up/Down change months, and Shift changes years. Short months clamp to their final day. The agenda follows the focused date, and Tab can leave the days for the next control. Keyboard help is displayed in the calendar.

The first Tab exposes **Skip to main content**. Empty record searches offer **Reset record filters**, and unavailable browser storage is announced with **Retry opening workspace**. The browser suite runs its own server on port 4178 with strict port selection; it refuses to reuse an existing server so another project's preview cannot accidentally be tested.

## Storage versions and concurrent tabs

Local snapshots have version 1 metadata and an opaque revision. Existing unversioned workspaces are migrated transactionally without replacing their data or attachment blobs. Unknown future formats and malformed snapshots fail safely without reseeding or deleting storage. Backups still use their separate portable version 1 format.

A save checks the revision and writes data plus new metadata in one transaction. If another tab saved first, the stale write is rejected and the draft stays visible. Reload to see the saved workspace, then re-enter your intended change; unsaved drafts are not automatically merged or retained after reload. Writes are guarded within each tab too. All tabs must run this version of the app for the protection to apply: legacy code that bypasses revision checks cannot be coordinated. This is local concurrency control, not cross-device sync.

## Attachment and export limits

Uploads and backups share a 5 × 1024 × 1024 byte per-file maximum, accepted MIME types and 150-character attachment-name limit. The exact size boundary is allowed. Unsupported, oversized or overlong-named uploads are rejected before saving; rename a long source file before attaching it. These are client-side convenience checks, not file-content authentication or malware scanning.

Export validates the snapshot shape and record links against restore requirements before producing a download. It includes base64 expansion and JSON metadata in its 100 × 1024 × 1024 byte budget and rejects an oversized snapshot before reading attachment contents. Files are encoded one at a time to reduce concurrent memory use. Existing data remains untouched when export fails. Larger workspaces must be reduced to the supported limits before export; automatic splitting is not implemented.
