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
  await page
    .getByLabel("Attach a file")
    .setInputFiles({
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
