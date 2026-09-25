import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the South West Delhi hero and a real school count", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Find the right school in South West Delhi", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/\d+ schools? · fees, facilities/)).toBeVisible();
});

test("admissions section shows the empty state when no cycles are open", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Admissions open now" })).toBeVisible();
  await expect(page.getByText("No open admission windows yet")).toBeVisible();
  await expect(page.getByRole("link", { name: /Browse all schools/ })).toBeVisible();
});

test("hero search form navigates to /schools with the query", async ({ page }) => {
  await page.goto("/en");
  await page.getByPlaceholder("School name or area").fill("Shreeram");
  await page.getByPlaceholder("School name or area").press("Enter");
  await expect(page).toHaveURL(/\/en\/schools\?q=Shreeram/);
});

test("tools section links to the three forward-referenced tool routes", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("link", { name: /Check age eligibility/ })).toHaveAttribute(
    "href",
    "/en/tools/age-eligibility",
  );
  await expect(page.getByRole("link", { name: /Compare schools/ })).toHaveAttribute(
    "href",
    "/en/compare",
  );
  await expect(page.getByRole("link", { name: /Get WhatsApp alerts/ })).toHaveAttribute(
    "href",
    "/en/alerts",
  );
});

test("axe: home page has no serious/critical violations", async ({ page }) => {
  await page.goto("/en");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
