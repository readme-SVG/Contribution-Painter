import { test, expect } from "@playwright/test";
import { createCalendar } from "../../js/core/calendar.js";

const year = new Date().getUTCFullYear();
const currentCells = createCalendar(year).days.length;
const previousDays = createCalendar(year - 1).activeIndices.length;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
});

test("renders an accessible grid without runtime errors or remote assets", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(7);
  await expect(page.locator(".cell")).toHaveCount(currentCells);
  await expect(page.locator("#token")).toHaveAttribute("type", "password");
  expect(errors).toEqual([]);
});

test("painting, undo, redo, clear and invert operate on the current year", async ({
  page,
}) => {
  await page.locator(".cell:not(.out)").first().click();
  await expect(page.locator("#sDays")).toHaveText("1");
  await page.locator("#undoBtn").click();
  await expect(page.locator("#sDays")).toHaveText("0");
  await page.locator("#redoBtn").click();
  await expect(page.locator("#sDays")).toHaveText("1");
  await page.locator("#selYear").selectOption(String(year - 1));
  await expect(page.locator("#sDays")).toHaveText("0");
  await page.locator("#fillBtn").click();
  await expect(page.locator("#sDays")).toHaveText(String(previousDays));
  await page.locator("#selYear").selectOption(String(year));
  await expect(page.locator("#sDays")).toHaveText("1");
  await page.locator("#clearBtn").click();
  await expect(page.locator("#sDays")).toHaveText("0");
  await page.locator("#invertBtn").click();
  await expect(page.locator("#sDays")).not.toHaveText("0");
});

test("keyboard painting and palette shortcuts work", async ({ page }) => {
  await page.keyboard.press("3");
  await expect(page.locator('.swatch[data-level="3"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const first = page.locator(".cell:not(.out)").first();
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toHaveAttribute("data-level", "3");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator("#sDays")).toHaveText("2");
  await page.keyboard.press("Control+z");
  await expect(page.locator("#sDays")).toHaveText("1");
});

test("dragging paints a continuous stroke that undoes as one operation", async ({
  page,
}) => {
  await page.locator("#selYear").selectOption(String(year - 1));
  await page.keyboard.press("2");
  const cells = page.locator(".cell:not(.out)");
  const start = await cells.nth(0).boundingBox();
  const end = await cells.nth(5).boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(page.locator("#sDays")).toHaveText("6");
  await page.locator("#undoBtn").click();
  await expect(page.locator("#sDays")).toHaveText("0");
});

test("percentage validation is inline and fill creates the requested number of days", async ({
  page,
}) => {
  await page.locator("#selYear").selectOption(String(year - 1));
  await page.locator("#fillPercent").fill("50oops");
  await page.locator("#fillBtn").click();
  await expect(page.locator("#statusBar")).toContainText("percentage");
  await expect(page.locator("#fillPercent")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator("#fillPercent").fill("50%");
  await page.locator("#fillBtn").click();
  await expect(page.locator("#sDays")).toHaveText(
    String(Math.round(previousDays * 0.5)),
  );
});

test("drafts persist without credentials and JSON/SVG exports are usable", async ({
  page,
}) => {
  await page.locator("#token").fill("sensitive-token");
  await page.locator("#repo").fill("owner/repo");
  await page.locator(".cell:not(.out)").first().click();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.locator("#sDays")).toHaveText("1");
  await expect(page.locator("#token")).toHaveValue("");
  await expect(page.locator("#repo")).toHaveValue("");
  const jsonDownload = page.waitForEvent("download");
  await page.locator("#exportBtn").click();
  expect((await jsonDownload).suggestedFilename()).toBe(
    `contribution-pattern-${year}.json`,
  );
  await page.locator("#previewBtn").click();
  await expect(page.locator("#previewDialog")).toBeVisible();
  await expect(page.locator("#svgPreview svg")).toHaveAttribute("role", "img");
  const svgDownload = page.waitForEvent("download");
  await page.locator("#downloadSvgBtn").click();
  expect((await svgDownload).suggestedFilename()).toMatch(/\.svg$/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#previewDialog")).not.toBeVisible();
});

test("JSON import validates content and remains undoable", async ({ page }) => {
  const cells = { [`${year}-01-01`]: 4 };
  await page.locator("#importFile").setInputFiles({
    name: "pattern.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "contribution-painter",
        version: 1,
        year,
        cells,
      }),
    ),
  });
  await expect(page.locator("#sDays")).toHaveText("1");
  await page.locator("#undoBtn").click();
  await expect(page.locator("#sDays")).toHaveText("0");
  await page.locator("#importFile").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"year":2024}'),
  });
  await expect(page.locator("#statusBar")).toContainText(
    "valid Contribution Painter",
  );
});

test("publishing requires review and sends no request before confirmation", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://api.github.com/**", async (route) => {
    requests += 1;
    await route.fulfill({ status: 500, json: { message: "unexpected" } });
  });
  await page.locator(".cell:not(.out)").first().click();
  await page.locator("#pushBtn").click();
  await expect(page.locator("#statusBar")).toContainText("repository");
  expect(requests).toBe(0);
  await page.locator("#token").fill("test-token");
  await page.locator("#repo").fill("owner/repo");
  await page.locator("#email").fill("user@example.com");
  await page.locator("#pushBtn").click();
  await expect(page.locator("#publishDialog")).toBeVisible();
  await expect(page.locator("#reviewRepo")).toHaveText("owner/repo");
  expect(requests).toBe(0);
  await page.keyboard.press("Escape");
  expect(requests).toBe(0);
});

test("all locales load and mobile layout has no page-level horizontal overflow", async ({
  page,
}) => {
  for (const locale of [
    "ru-RU",
    "uk-UA",
    "kk-KZ",
    "cs-CZ",
    "nl-NL",
    "sv-SE",
    "de-DE",
    "pl-PL",
    "fr-FR",
    "zh-CN",
    "ja-JP",
    "en-US",
  ]) {
    await page.locator("#langSelect").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".graph-scroll")).toBeVisible();
});
