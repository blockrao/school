import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the real Jaipur city page", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await expect(page.getByRole("heading", { name: "Jaipur schools", level: 1 })).toBeVisible();
  await expect(page.getByText(/\d+ schools?/)).toBeVisible();
});

test("breadcrumb shows title-cased state and city", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Rajasthan");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Jaipur");
});

test("unknown city slug 404s", async ({ page }) => {
  const response = await page.goto("/en/rajasthan/nonexistent-city");
  expect(response?.status()).toBe(404);
});

test("city that doesn't belong to the given state 404s", async ({ page }) => {
  const response = await page.goto("/en/haryana/jaipur");
  expect(response?.status()).toBe(404);
});

test("shows the empty state when no schools are published", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await expect(page.getByText("No published schools here yet")).toBeVisible();
});

test("applying a filter navigates with query params and sets noindex", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await page.getByRole("checkbox", { name: "Admissions open now" }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  // Native GET-form submission includes every field, including the untouched
  // empty selects (board=&grade=), so admissions=open isn't necessarily first.
  await expect(page).toHaveURL(/[?&]admissions=open/);

  const robotsMeta = page.locator('meta[name="robots"]');
  await expect(robotsMeta).toHaveAttribute("content", /noindex/);
});

test("unfiltered page has no noindex meta tag", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("axe: city page has no serious/critical violations", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
