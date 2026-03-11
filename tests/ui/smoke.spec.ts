import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page renders and exposes the access CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /shared movie lists that feel organized before the night even starts\./i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /open your workspace/i })).toBeVisible();
});

test("login page is reachable and basic accessibility stays clean", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", {
      name: /welcome back, or start fresh without leaving this page\./i,
    }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();

  expect(accessibility.violations).toEqual([]);
});

test("offline fallback route stays reachable", async ({ page }) => {
  await page.goto("/offline");

  await expect(page.getByText(/you are offline/i)).toBeVisible();
});
