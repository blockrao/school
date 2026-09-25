import { expect, test } from "@playwright/test";

test("town page renders under the state directly, not nested under a city", async ({ page }) => {
  await page.goto("/en/rajasthan/chomu");
  await expect(page.getByRole("heading", { name: "Schools near Chomu", level: 1 })).toBeVisible();
});

test("locality-shaped request for a town slug redirects to the peer-level town URL", async ({
  page,
}) => {
  const response = await page.goto("/en/rajasthan/jaipur/chomu");
  expect(response?.url()).toContain("/en/rajasthan/chomu");
});

test("unknown locality slug 404s", async ({ page }) => {
  const response = await page.goto("/en/rajasthan/jaipur/nonexistent-locality");
  expect(response?.status()).toBe(404);
});

test("no page anywhere renders the word 'district'", async ({ page }) => {
  await page.goto("/en/rajasthan/jaipur");
  await expect(page.getByText(/district/i)).toHaveCount(0);
});
