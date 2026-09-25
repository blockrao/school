import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the real South West Delhi district page", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  await expect(
    page.getByRole("heading", { name: "South West Delhi schools", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/\d+ schools?/)).toBeVisible();
});

test("breadcrumb shows title-cased state and district", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Delhi");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
    "South West Delhi",
  );
});

test("unknown district slug 404s", async ({ page }) => {
  const response = await page.goto("/en/delhi/nonexistent-district");
  expect(response?.status()).toBe(404);
});

test("district that doesn't belong to the given state 404s", async ({ page }) => {
  const response = await page.goto("/en/haryana/south-west-delhi");
  expect(response?.status()).toBe(404);
});

test("shows the empty state when no schools are published", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  await expect(page.getByText("No published schools here yet")).toBeVisible();
});

test("applying a filter navigates with query params and sets noindex", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  await page.getByRole("checkbox", { name: "Admissions open now" }).check();
  await page.getByRole("button", { name: "Apply filters" }).click();
  // Native GET-form submission includes every field, including the untouched
  // empty selects (board=&grade=), so admissions=open isn't necessarily first.
  await expect(page).toHaveURL(/[?&]admissions=open/);

  const robotsMeta = page.locator('meta[name="robots"]');
  await expect(robotsMeta).toHaveAttribute("content", /noindex/);
});

test("unfiltered page has no noindex meta tag", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("axe: district page has no serious/critical violations", async ({ page }) => {
  await page.goto("/en/delhi/south-west-delhi");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
