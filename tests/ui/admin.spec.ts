import { expect, test } from "@playwright/test";

import {
  loginViaAccessFlow,
  logoutFromShell,
  registerViaAccessFlow,
} from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import { cleanupUsersByEmails, promoteUserToAdmin } from "./helpers/db";
import { createTestIdentity } from "./helpers/test-data";

test("system admin settings stay navigable and submittable from the UI", async ({ page }) => {
  const admin = createTestIdentity("admin");
  const monitor = monitorClientErrors(page, "admin flow");

  try {
    await registerViaAccessFlow(page, admin);
    await promoteUserToAdmin(admin.email);
    await logoutFromShell(page);
    await loginViaAccessFlow(page, admin);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /system settings/i })).toBeVisible();

    await page.getByRole("button", { name: /save tmdb settings/i }).click();
    await page.getByRole("switch", { name: /email code/i }).click();
    await page.getByRole("button", { name: /save access methods/i }).click();
    await page.getByRole("button", { name: /save push keys/i }).click();
    await page.getByRole("button", { name: /save provider settings/i }).first().click();

    await page.goto("/admin/streaming");
    await expect(page).toHaveURL(/\/admin$/);

    await monitor.assertClean();
  } finally {
    await cleanupUsersByEmails([admin.email]);
  }
});
