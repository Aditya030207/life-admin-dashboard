import { test, expect } from "@playwright/test";

// Exercise the supported system-font fallback without third-party network delays.
test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
});

test("record CRUD, attachment persistence and categories", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What needs attention this month" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Test utility bill");
  await page.getByLabel("Amount (INR)").fill("250");
  await page.getByRole("button", { name: "Save record" }).click();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test utility bill" })
    .click();
  await page.getByLabel("Attach a file").setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("demo attachment"),
  });
  await expect(page.getByLabel("Attachment name")).toHaveValue("sample.txt");
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();
  await expect(page.getByLabel("Reminder title")).toHaveValue(
    "Review Test utility bill",
  );
  await page.reload();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test utility bill" })
    .click();
  await expect(page.getByLabel("Attachment name")).toHaveValue("sample.txt");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Updated utility bill");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated utility bill", exact: true }),
  ).toBeVisible();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Updated utility bill" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Categories", exact: true }).click();
  await page.getByLabel("New category").fill("Education");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect(page.getByText("Education", { exact: true })).toBeVisible();
});
test("mobile dashboard fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Life, a little more organized." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "docs/mobile.png", fullPage: true });
});
test("desktop screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "What needs attention this month" }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/dashboard.png", fullPage: true });
});

test("dashboard refreshes its calendar day without reloading", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-10T23:59:30") });
  await page.goto("/");
  await expect(page.locator("header")).toContainText("10 October 2026");
  await page.clock.fastForward(61000);
  await expect(page.locator("header")).toContainText("11 October 2026");
});

test("downloaded backup contains saved attachment bytes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Passport copy" }).click();
  await page.getByLabel("Attach a file").setInputFiles({
    name: "backup-demo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("portable attachment"),
  });
  await expect(page.getByLabel("Attachment name")).toHaveValue(
    "backup-demo.txt",
  );
  await page.getByRole("button", { name: "Close details" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(
    /^life-admin-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.version).toBe(1);
  expect(backup.data.records).toHaveLength(7);
  expect(
    Buffer.from(backup.data.attachments[0].base64, "base64").toString(),
  ).toBe("portable attachment");
  await expect(page.getByRole("status")).toContainText("Backup downloaded");
});

test("restore validates before replacement and cancellation preserves records", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "What needs attention this month" })
    .waitFor();
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("valid JSON");
  const snapshot = await page.evaluate(async () => {
    const request = indexedDB.open("life-admin");
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
    const get = db.transaction("state").objectStore("state").get("data");
    const data = await new Promise<any>((resolve, reject) => {
      get.onsuccess = () => resolve(get.result);
      get.onerror = reject;
    });
    db.close();
    return {
      format: "life-admin-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        ...data,
        records: [{ ...data.records[0], title: "Restored insurance" }],
        reminders: [],
        attachments: [
          {
            id: "restored-file",
            recordId: data.records[0].id,
            name: "restored.txt",
            mimeType: "text/plain",
            size: 5,
            base64: btoa("hello"),
          },
        ],
      },
    };
  });
  const file = {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  };
  await page.getByLabel("Choose backup file").setInputFiles(file);
  await expect(
    page.getByRole("dialog", { name: "Replace your workspace?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel restore" }).click();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Passport copy" }),
  ).toBeVisible();
  await page.getByLabel("Choose backup file").setInputFiles(file);
  await page.getByRole("button", { name: "Replace workspace" }).click();
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page.reload();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Passport copy" }),
  ).toHaveCount(0);
  await page
    .getByRole("button")
    .filter({ hasText: "Restored insurance" })
    .click();
  await expect(page.getByLabel("Attachment name")).toHaveValue("restored.txt");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download restored.txt" }).click();
  const stream = await (await downloadEvent).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toBe("hello");
});

test("monthly completion persists one renewal across reopening and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Monthly rent");
  await page.getByLabel("Due date", { exact: true }).fill("2026-01-31");
  await page.getByLabel("Repeat", { exact: true }).selectOption("monthly");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Monthly rent" }).click();
  await page
    .getByRole("button", { name: "Complete & renew", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("next renewal");
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete & renew", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("button").filter({ hasText: "Monthly rent" }),
  ).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Monthly rent" })
    .nth(1)
    .click();
  await expect(page.locator(".detail-meta")).toContainText("2026-02-28");
  await page
    .getByRole("button", { name: "Complete & renew", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("button").filter({ hasText: "Monthly rent" }),
  ).toHaveCount(3);
  await page
    .getByRole("button")
    .filter({ hasText: "Monthly rent" })
    .nth(2)
    .click();
  await expect(page.locator(".detail-meta")).toContainText("2026-03-31");
});

test("calendar navigation, filters, completion and mobile layout", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-13T12:00:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "2026-10-08, 1 records", exact: true })
    .click();
  await page
    .locator(".agenda-row")
    .filter({ hasText: "Internet bill" })
    .click();
  await page
    .getByRole("button", { name: "Mark complete", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "2026-10-08, 0 records", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Include completed", { exact: true }).check();
  await expect(page.locator(".agenda-row")).toContainText("Completed");
  await page.getByLabel("Calendar record type").selectOption("Insurance");
  await expect(page.locator(".agenda-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "2026-10-24, 1 records", exact: true })
    .click();
  await expect(page.locator(".agenda-row")).toContainText(
    "Health insurance renewal",
  );
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "November 2026", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".calendar-agenda")).toContainText(
    "No records due",
  );
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "2026-10-13, 0 records", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // Resume painting before resizing: a paused clock can duplicate full-page tiles.
  await page.clock.resume();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/calendar.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/calendar-mobile.png", fullPage: true });
});

test("contact fields persist and participate in search", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Demo advisor");
  await page
    .getByRole("dialog")
    .getByRole("combobox")
    .first()
    .selectOption("Contact");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("advisor@example.com");
  await page
    .getByLabel("Phone number", { exact: true })
    .fill("+44 (0)20 7946 0000 ext 123");
  await page.getByLabel("Organization", { exact: true }).fill("Example Clinic");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByLabel("Search records").fill("Example Clinic");
  await page.getByRole("button").filter({ hasText: "Demo advisor" }).click();
  await expect(page.locator(".contact-details")).toContainText(
    "advisor@example.com",
  );
  await expect(page.locator(".contact-details")).toContainText("ext 123");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("updated@example.com");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.locator(".contact-details")).toContainText(
    "updated@example.com",
  );
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await page.getByLabel("Search records").fill("updated@example.com");
  await expect(
    page.getByRole("button").filter({ hasText: "Demo advisor" }),
  ).toBeVisible();
  await page.getByLabel("Search records").fill("ext 123");
  await expect(
    page.getByRole("button").filter({ hasText: "Demo advisor" }),
  ).toBeVisible();
});

test("record dialogs contain focus, support Escape and restore their opener", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "All records", exact: true }).click();
  const opener = page
    .getByRole("button")
    .filter({ hasText: "Health insurance renewal" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const details = page.getByRole("dialog", {
    name: "Health insurance renewal",
    exact: true,
  });
  await expect(details).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    details.getByRole("button", { name: "Edit", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeFocused();
  await page.screenshot({ path: "docs/record-details.png" });
  await page
    .getByRole("button", { name: "Add record", exact: true })
    .evaluate((el) => (el as HTMLElement).focus());
  expect(
    await details.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await details.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  const edit = details.getByRole("button", { name: "Edit", exact: true });
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Edit record", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Edit record", exact: true }),
  ).not.toBeVisible();
  await expect(edit).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(details).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("deleting a record restores focus to the page heading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Health insurance renewal" })
    .click();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "All records", exact: true }),
  ).toBeFocused();
});

test("calendar has one day tab stop and moves focus across months with keys", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-14T12:00:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator('.calendar-day[tabindex="0"]')).toHaveCount(1);
  const day = page.getByRole("button", {
    name: "2026-10-14, 0 records",
    exact: true,
  });
  await day.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "2026-10-15, 0 records", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("button", { name: "2026-10-12, 0 records", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("button", { name: "2026-10-18, 1 records", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(
    page.getByRole("heading", { name: "November 2026", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "2026-11-18, 0 records", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+PageUp");
  await expect(
    page.getByRole("button", { name: "2025-11-18, 0 records", exact: true }),
  ).toBeFocused();
  await expect(page.locator('.calendar-day[tabindex="0"]')).toHaveCount(1);
});

test("skip link and empty search recovery work with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "Life, a little more organized." })
    .waitFor();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByLabel("Search records").fill("nothing matches this query");
  await expect(
    page.getByText("No records found.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset record filters" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Search records")).toHaveValue("");
  await expect(
    page.getByRole("button").filter({ hasText: "Passport copy" }),
  ).toBeVisible();
});

test("workspace opening failure is announced and can be retried", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { failStorage: boolean };
    state.failStorage = true;
    const original = indexedDB.open.bind(indexedDB);
    Object.defineProperty(indexedDB, "open", {
      configurable: true,
      value: (...args: Parameters<IDBFactory["open"]>) => {
        if (state.failStorage)
          throw new DOMException("Disabled for test", "SecurityError");
        return original(...args);
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("browser storage");
  await page.evaluate(() => {
    (window as typeof window & { failStorage: boolean }).failStorage = false;
  });
  await page.getByRole("button", { name: "Retry opening workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Life, a little more organized." }),
  ).toBeVisible();
});

test("a stale tab cannot overwrite another tab and reload recovers the latest data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "What needs attention this month" })
    .waitFor();
  const other = await context.newPage();
  await other.goto("/");
  await other
    .getByRole("heading", { name: "What needs attention this month" })
    .waitFor();
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Saved in first tab");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await other.getByRole("button", { name: "Add record", exact: true }).click();
  await other.getByLabel("Title", { exact: true }).fill("Stale second tab");
  await other.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    other
      .getByRole("dialog", { name: "Add a record", exact: true })
      .getByRole("alert"),
  ).toContainText("Another tab saved changes");
  await expect(other.getByLabel("Title", { exact: true })).toHaveValue(
    "Stale second tab",
  );
  await other.reload();
  await other.getByRole("button", { name: "All records", exact: true }).click();
  await expect(
    other.getByRole("button").filter({ hasText: "Saved in first tab" }),
  ).toBeVisible();
  await expect(
    other.getByRole("button").filter({ hasText: "Stale second tab" }),
  ).toHaveCount(0);
});

test("a failed metadata write rolls back data and a later retry succeeds", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { failWrites: boolean };
    state.failWrites = false;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (state.failWrites && key === "metadata")
        throw new DOMException("Simulated quota failure", "QuotaExceededError");
      return original.call(this, value, key);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Atomic save test");
  await page.evaluate(() => {
    (window as typeof window & { failWrites: boolean }).failWrites = true;
  });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Add a record", exact: true })
      .getByRole("alert"),
  ).toContainText("Could not save");
  const titles = await page.evaluate(async () => {
    const request = indexedDB.open("life-admin");
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const get = db.transaction("state").objectStore("state").get("data");
    const data = await new Promise<{ records: { title: string }[] }>(
      (resolve) => {
        get.onsuccess = () => resolve(get.result);
      },
    );
    db.close();
    return data.records.map((r) => r.title);
  });
  expect(titles).not.toContain("Atomic save test");
  await page.evaluate(() => {
    (window as typeof window & { failWrites: boolean }).failWrites = false;
  });
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  // Saving is asynchronous: wait for the successful commit before navigating.
  await expect(
    page.getByRole("dialog", { name: "Add a record", exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await expect(
    page.getByRole("button").filter({ hasText: "Atomic save test" }),
  ).toBeVisible();
});

test("unknown storage versions remain untouched on opening and retry", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("heading", { name: "What needs attention this month" })
    .waitFor();
  await page.evaluate(async () => {
    const request = indexedDB.open("life-admin");
    const db = await new Promise<IDBDatabase>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(
      { format: "life-admin-state", version: 2, revision: "future" },
      "metadata",
    );
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "unsupported storage format",
  );
  await page.getByRole("button", { name: "Retry opening workspace" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "unsupported storage format",
  );
  expect(
    await page.evaluate(async () => {
      const request = indexedDB.open("life-admin");
      const db = await new Promise<IDBDatabase>((resolve) => {
        request.onsuccess = () => resolve(request.result);
      });
      const get = db.transaction("state").objectStore("state").get("metadata");
      const meta = await new Promise<{ version: number }>((resolve) => {
        get.onsuccess = () => resolve(get.result);
      });
      db.close();
      return meta.version;
    }),
  ).toBe(2);
});

test("attachment limits reject invalid files and export an exact-limit file", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Passport copy" }).click();
  const details = page.getByRole("dialog", {
    name: "Passport copy",
    exact: true,
  });
  const input = page.getByLabel("Attach a file");
  await input.setInputFiles({
    name: "oversized.txt",
    mimeType: "text/plain",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(details.getByRole("alert")).toContainText("5 MB");
  await expect(page.getByLabel("Attachment name")).toHaveCount(0);
  await input.setInputFiles({
    name: "page.html",
    mimeType: "text/html",
    buffer: Buffer.from("<b>sample</b>"),
  });
  await expect(details.getByRole("alert")).toContainText("PDF, PNG, JPEG");
  await input.setInputFiles({
    name: "x".repeat(151),
    mimeType: "text/plain",
    buffer: Buffer.from("demo"),
  });
  await expect(details.getByRole("alert")).toContainText("150");
  await expect(page.getByLabel("Attachment name")).toHaveCount(0);
  const bytes = Buffer.alloc(5 * 1024 * 1024);
  bytes[0] = 65;
  bytes[bytes.length - 1] = 90;
  await input.setInputFiles({
    name: "boundary.txt",
    mimeType: "text/plain",
    buffer: bytes,
  });
  await expect(page.getByLabel("Attachment name")).toHaveValue("boundary.txt");
  await page.getByRole("button", { name: "Close details" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.data.attachments[0].size).toBe(bytes.length);
  expect(Buffer.from(backup.data.attachments[0].base64, "base64")).toEqual(
    bytes,
  );
});

test("maximum-length record titles produce backup-compatible reminders", async ({ page }) => {
  const title = "Portfolio reminder ".padEnd(100, "X");
  await page.goto("/");
  await page.getByRole("button", { name: "Add record", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "All records", exact: true }).click();
  await page.getByRole("button").filter({ hasText: title }).click();
  await page.getByRole("button", { name: "Add reminder", exact: true }).click();
  await expect(page.getByLabel("Reminder title")).toHaveValue(`Review ${title}`.slice(0, 100));
  await page.getByRole("button", { name: "Close details" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.data.reminders.at(-1).title).toHaveLength(100);
});
