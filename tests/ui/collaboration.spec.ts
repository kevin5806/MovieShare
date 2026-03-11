import { expect, test } from "@playwright/test";

import {
  createIsolatedPage,
  registerViaAccessFlow,
  TEST_BASE_URL,
} from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import {
  cleanupUsersByEmails,
  getListMembershipRole,
  waitForInviteToken,
} from "./helpers/db";
import { createListName, createTestIdentity } from "./helpers/test-data";
import { chooseSelectOption, createList } from "./helpers/workspace";

test("list collaboration supports layered invites, role changes and member removal", async ({
  browser,
  page,
}) => {
  const owner = createTestIdentity("owner");
  const manager = createTestIdentity("manager");
  const guest = createTestIdentity("guest");
  const listName = createListName("Collab");
  const ownerMonitor = monitorClientErrors(page, "owner collaboration flow");
  const { context: managerContext, page: managerPage } = await createIsolatedPage(browser);
  const { context: guestContext, page: guestPage } = await createIsolatedPage(browser);
  const managerMonitor = monitorClientErrors(managerPage, "manager collaboration flow");
  const guestMonitor = monitorClientErrors(guestPage, "guest collaboration flow");

  try {
    await registerViaAccessFlow(page, owner);
    await createList(page, {
      name: listName,
      description: "UI coverage for invites, roles and list membership.",
    });

    const listPath = new URL(page.url()).pathname;
    const listSlug = listPath.split("/").filter(Boolean).pop();

    expect(listSlug).toBeTruthy();

    await page.goto(`/lists/${listSlug}/settings`);
    await registerViaAccessFlow(managerPage, manager);

    await page.getByPlaceholder("friend@example.com").fill(manager.email);
    await chooseSelectOption(page, "Invite role on join", "Manager");
    await page
      .getByPlaceholder("Optional context for this invite")
      .first()
      .fill("Come help manage the room.");
    await page.getByRole("button", { name: /send invite/i }).click();
    await expect(page.getByText(manager.email)).toBeVisible({ timeout: 20_000 });

    await managerPage.goto("/notifications");
    await managerPage.reload();
    await expect(managerPage.getByRole("heading", { name: /notifications/i })).toBeVisible();
    await expect(managerPage.getByText(/invited you to/i)).toBeVisible({ timeout: 20_000 });

    const appInviteToken = await waitForInviteToken({
      listName,
      kind: "APP_USER",
      email: manager.email,
    });

    await managerPage.goto(`${TEST_BASE_URL}/invites/lists/${appInviteToken}`);
    await expect(managerPage).toHaveURL(/\/invites\/lists\/.+/);
    await managerPage.getByRole("button", { name: /accept invite/i }).click();
    await expect(managerPage).toHaveURL(new RegExp(`/lists/${listSlug}$`));
    await managerPage.goto(`/lists/${listSlug}/settings`);
    await expect(managerPage.getByRole("heading", { name: /manage this list/i })).toBeVisible();

    await expect
      .poll(async () => getListMembershipRole({ listName, email: manager.email }))
      .toBe("MANAGER");

    await page.reload();
    const managerRow = page.locator(`[data-member-email="${manager.email}"]`);
    await expect(managerRow).toBeVisible();
    await chooseSelectOption(page, `Role for ${manager.name}`, "Member");
    await page.getByRole("button", { name: new RegExp(`save role for ${manager.name}`, "i") }).click();
    await expect
      .poll(async () => getListMembershipRole({ listName, email: manager.email }))
      .toBe("MEMBER");

    await page.getByRole("button", { name: /create public link/i }).click();
    await expect(page.getByText("Public link").first()).toBeVisible({ timeout: 20_000 });
    const publicInviteToken = await waitForInviteToken({
      listName,
      kind: "PUBLIC_LINK",
    });

    await registerViaAccessFlow(guestPage, guest);
    await guestPage.goto(`${TEST_BASE_URL}/invites/lists/${publicInviteToken}`);
    await expect(guestPage.getByText(/list invite/i)).toBeVisible();
    await guestPage.getByRole("button", { name: /accept invite/i }).click();
    await expect(guestPage).toHaveURL(new RegExp(`/lists/${listSlug}$`));
    await expect(guestPage.getByRole("heading", { name: listName })).toBeVisible();

    await page.reload();
    const guestRow = page.locator(`[data-member-email="${guest.email}"]`);
    await expect(guestRow).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`remove .*${guest.name}`, "i") }).click();
    await expect(guestRow).toHaveCount(0);

    await ownerMonitor.assertClean();
    await managerMonitor.assertClean();
    await guestMonitor.assertClean();
  } finally {
    await managerContext.close().catch(() => {});
    await guestContext.close().catch(() => {});
    await cleanupUsersByEmails([owner.email, manager.email, guest.email]);
  }
});
