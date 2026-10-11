import { test, expect } from "@playwright/test";
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
  await page
    .getByLabel("Choose backup file")
    .setInputFiles({
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
