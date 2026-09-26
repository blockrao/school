import { expect, test } from "@playwright/test";

// A real published Jaipur school with no team affiliations yet (production
// has zero school_teacher_affiliations rows at launch) — exercises the
// honest-empty-state path this route is expected to render for virtually
// every school right now.
const SCHOOL_PATH = "/en/jaipur/rukmani-birla-modern-high-school-jaipur-110560";

test("renders the empty state for a school with no published team yet", async ({ page }) => {
  await page.goto(`${SCHOOL_PATH}/teachers`);
  await expect(
    page.getByRole("heading", { name: "Teachers at Rukmani Birla Modern High School", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("No teachers listed yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to school page" })).toBeVisible();
});

test("back link returns to the school's overview page", async ({ page }) => {
  await page.goto(`${SCHOOL_PATH}/teachers`);
  await page
    .getByRole("link", { name: /Rukmani Birla Modern High School/, exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(SCHOOL_PATH);
});

test("an empty roster is noindex — thin content isn't served to crawlers", async ({ page }) => {
  await page.goto(`${SCHOOL_PATH}/teachers`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("unknown school slug under /teachers 404s", async ({ page }) => {
  const response = await page.goto("/en/jaipur/no-such-school-at-all-999999/teachers");
  expect(response?.status()).toBe(404);
});

test("overview page has no 'Teachers at' teaser when the school has no published team", async ({
  page,
}) => {
  await page.goto(SCHOOL_PATH);
  await expect(page.getByRole("heading", { name: /^Teachers at/ })).toHaveCount(0);
});
