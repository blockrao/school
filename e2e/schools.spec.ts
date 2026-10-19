import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders the search results page for Jaipur", async ({ page }) => {
  await page.goto("/en/schools");
  await expect(page.getByRole("heading", { name: "Schools in Jaipur", level: 1 })).toBeVisible();
});

test("search form submits q as a query param", async ({ page }) => {
  await page.goto("/en/schools");
  await page.getByPlaceholder("School name").fill("Shreeram");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/[?&]q=Shreeram/);
  await expect(page.getByText('"Shreeram"')).toBeVisible();
});

test("query with no matches shows the empty state with a next step", async ({ page }) => {
  await page.goto("/en/schools?q=zzz-no-such-school");
  await expect(page.getByText("No schools match your search")).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear search" })).toBeVisible();
});

test("meta robots is noindex (search results are dynamic, not the canonical listing)", async ({
  page,
}) => {
  await page.goto("/en/schools");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});


test("axe: search results page has no serious/critical violations", async ({ page }) => {
  await page.goto("/en/schools");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
