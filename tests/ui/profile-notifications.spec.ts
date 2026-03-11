import { expect, test } from "@playwright/test";

import { createIsolatedPage, registerViaAccessFlow } from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import { cleanupUsersByEmails } from "./helpers/db";
import { createTestIdentity } from "./helpers/test-data";

test("profile, notifications and friend invites stay usable from the client", async ({
  browser,
  page,
}) => {
  const alice = createTestIdentity("alice");
  const bob = createTestIdentity("bob");
  const aliceMonitor = monitorClientErrors(page, "alice profile flow");
  const { context: bobContext, page: bobPage } = await createIsolatedPage(browser);
  const bobMonitor = monitorClientErrors(bobPage, "bob profile flow");

  try {
    await registerViaAccessFlow(page, alice);
    await registerViaAccessFlow(bobPage, bob);

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /access and security/i })).toBeVisible();
    await expect(page.getByText("Passkeys", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Display name").fill("Alice UI");
    await page.getByPlaceholder("Location").fill("Rome");
    await page.getByPlaceholder("Favorite genres, comma separated").fill("Sci-Fi, Drama");
    await page.getByPlaceholder("Short bio or movie vibe").fill("Late-night watcher");
    await page.getByRole("button", { name: /^Save profile$/ }).click();
    await expect(page.getByPlaceholder("Display name")).toHaveValue("Alice UI", {
      timeout: 20_000,
    });

    await page.getByPlaceholder("friend@example.com").fill(bob.email);
    await page.getByPlaceholder("Optional message").fill("Join my recurring movie circle.");
    await page.getByRole("button", { name: /add connection/i }).click();
    await expect(page.getByText(bob.email)).toBeVisible({ timeout: 20_000 });

    await bobPage.goto("/notifications");
    await bobPage.reload();
    await expect(bobPage.getByRole("heading", { name: /notifications/i })).toBeVisible();
    await expect(bobPage.getByText(/sent you a friend invite/i)).toBeVisible({
      timeout: 20_000,
    });
    await bobPage.getByRole("button", { name: /mark all read/i }).click();

    await bobPage.goto("/profile");
    await expect(bobPage.getByText("Join my recurring movie circle.")).toBeVisible();
    await bobPage.getByRole("button", { name: /^Accept$/ }).click();
    await expect(bobPage.getByText("Alice UI")).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByText(bob.name)).toBeVisible({ timeout: 20_000 });

    const listInvitesEmailSwitch = bobPage.getByRole("switch", {
      name: /list invites email/i,
    });
    const wasChecked = await listInvitesEmailSwitch.getAttribute("aria-checked");
    await listInvitesEmailSwitch.click();
    await bobPage.getByRole("button", { name: /save notification preferences/i }).click();
    await expect(listInvitesEmailSwitch).toHaveAttribute(
      "aria-checked",
      wasChecked === "true" ? "false" : "true",
    );
    await expect(bobPage.getByText(/push notifications on this device/i)).toBeVisible();

    await aliceMonitor.assertClean();
    await bobMonitor.assertClean();
  } finally {
    await bobContext.close().catch(() => {});
    await cleanupUsersByEmails([alice.email, bob.email]);
  }
});
