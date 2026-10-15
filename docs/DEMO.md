# Five-minute reviewer walkthrough

Run the app using the README. Use a fresh browser profile/origin for fictional seed data; do not clear a workspace containing information you want to keep. No keys or account are required. Screenshots and browser tests use fictional information.

1. **Attention dashboard:** inspect this month's open items and overdue badges. Open a record and review its details, reminders and attachments. The demo dates are relative to the local month.
2. **CRUD and search:** add a Bill named “Demo internet bill”, choose a category and a due date in the current month, and enter an INR amount. Find it in All records, edit its notes, and search for it. Create/rename a spare category; deletion of an in-use category is blocked.
3. **Renewal logic:** create a monthly Subscription due January 31, 2027. Open it and choose Complete & renew. In All records, inspect February 28; completing that occurrence produces March 31. Reopen/recomplete the original to confirm there is still only one successor. These are demonstration due dates, not activity timestamps.
4. **Calendar and contacts:** navigate to the demonstration month and select the due day. Try the type filter and completed toggle. Add a Contact with a fictional organization and `demo@example.com`; search by organization.
5. **Linked information:** add a reminder to the demo bill, edit its title and mark it complete. Attach a small `.txt` file containing only “Fictional portfolio demo”; rename and download it.
6. **Recovery:** export a backup. Delete the demo bill and confirm its linked files/reminders disappear. Restore the backup after reading the replacement confirmation. Reload and verify the bill and attachment return. Export an existing workspace before replacing it.
7. **Keyboard/mobile:** Tab to the skip link; open a record with Enter, edit it, then use Escape to return focus. In Calendar, use arrows and Page Up/Down. Resize to 390px and check that navigation and record controls remain usable.

Automated browser scenarios exercise these feature areas and capture screenshots, but this guide is not a claim of an externally hosted demo or a video recording. To reset a disposable demo, clear this origin's site data and reload; this permanently removes that local workspace.
