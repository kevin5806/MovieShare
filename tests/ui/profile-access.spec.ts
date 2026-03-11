import { expect, test } from "@playwright/test";

import {
  createIsolatedPage,
  loginViaAccessFlow,
  registerViaAccessFlow,
} from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import { cleanupUsersByEmails } from "./helpers/db";
import { createTestIdentity } from "./helpers/test-data";

test("profile exposes session management and access history", async ({ browser, page }) => {
  const user = createTestIdentity("access");
  const primaryMonitor = monitorClientErrors(page, "primary access profile");
  const { context: secondaryContext, page: secondaryPage } = await createIsolatedPage(browser);
  const secondaryMonitor = monitorClientErrors(secondaryPage, "secondary access profile");

  try {
    await registerViaAccessFlow(page, user);
    await loginViaAccessFlow(secondaryPage, user);

    await page.goto("/profile");
    await page.reload();

    await expect(page.getByRole("heading", { name: /sessions and access/i })).toBeVisible();
    await expect(page.getByText(/you currently have 2 active sessions/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Recent access history", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /sign out other devices/i }).click();

    await expect(page.getByText(/you currently have 1 active session/i)).toBeVisible({
      timeout: 20_000,
    });

    await secondaryPage.goto("/dashboard");
    await expect(secondaryPage).toHaveURL(/\/login$/);

    await primaryMonitor.assertClean();
    await secondaryMonitor.assertClean();
  } finally {
    await secondaryContext.close().catch(() => {});
    await cleanupUsersByEmails([user.email]);
  }
});
