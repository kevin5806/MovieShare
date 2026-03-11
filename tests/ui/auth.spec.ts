import { expect, test } from "@playwright/test";

import { loginViaAccessFlow, logoutFromShell, registerViaAccessFlow } from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import { cleanupUsersByEmails } from "./helpers/db";
import { createTestIdentity } from "./helpers/test-data";

test("progressive access flow covers sign-up, protected redirects and sign-in", async ({ page }) => {
  const user = createTestIdentity("auth");
  const monitor = monitorClientErrors(page, "auth flow");

  try {
    await registerViaAccessFlow(page, user);

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);

    await logoutFromShell(page);
    await loginViaAccessFlow(page, user);

    await page.goto("/lists");
    await expect(page.getByRole("heading", { name: /^Lists$/ })).toBeVisible();

    await monitor.assertClean();
  } finally {
    await cleanupUsersByEmails([user.email]);
  }
});
