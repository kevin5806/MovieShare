import { expect, test } from "@playwright/test";

import { registerViaAccessFlow } from "./helpers/auth";
import { monitorClientErrors } from "./helpers/client-errors";
import { cleanupUsersByEmails } from "./helpers/db";
import { createListName, createTestIdentity } from "./helpers/test-data";
import {
  addMovieFromTmdb,
  createList,
  expectImageToFillFrame,
  openMovieDetail,
} from "./helpers/workspace";

test("lists, ordering, movie feedback and watch tracking stay operational end-to-end", async ({
  page,
}) => {
  const user = createTestIdentity("lists");
  const listName = createListName("List");
  const feedbackComment = `Strong pick ${Date.now()}`;
  const monitor = monitorClientErrors(page, "lists and watch flow", {
    ignoreConsolePatterns: [
      /from origin 'https:\/\/vixsrc\.to'/i,
      /permissions policy violation: bluetooth/i,
      /failed to load resource: net::ERR_FAILED/i,
    ],
  });

  try {
    await registerViaAccessFlow(page, user);
    await createList(page, {
      name: listName,
      description: "UI coverage for collaborative movie planning.",
    });

    const listPath = new URL(page.url()).pathname;
    const listSlug = listPath.split("/").filter(Boolean).pop();

    expect(listSlug).toBeTruthy();

    await page.getByRole("button", { name: /add a title/i }).click();
    await page.getByLabel("Search movies").fill("Inception");

    const searchResult = page.getByRole("button", { name: /Inception/i }).first();
    await expect(searchResult).toBeVisible({ timeout: 20_000 });
    await expectImageToFillFrame(
      page.getByTestId("search-result-poster-frame").first(),
      page.getByTestId("search-result-poster-image").first(),
    );
    await page.getByRole("dialog").press("Escape");

    await addMovieFromTmdb(page, "Inception", /Inception/i);
    await addMovieFromTmdb(page, "Avatar", /Avatar/i);

    await expect(page.locator("a").filter({ hasText: /Inception/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await expectImageToFillFrame(
      page.getByTestId("movie-poster-frame").first(),
      page.getByTestId("movie-poster-image").first(),
    );

    await page.getByRole("button", { name: /^A to Z$/ }).click();
    await expect(
      page.locator('[data-testid="movie-poster-frame"]').first().locator("xpath=ancestor::a[1]"),
    ).toContainText(/Avatar/i);

    await page.goto("/dashboard");
    await page.goto(listPath);
    await expect(
      page.locator('[data-testid="movie-poster-frame"]').first().locator("xpath=ancestor::a[1]"),
    ).toContainText(/Avatar/i);

    await openMovieDetail(page, /Inception/i);
    await expectImageToFillFrame(
      page.getByTestId("movie-detail-poster-frame"),
      page.getByTestId("movie-detail-poster-image"),
    );
    const movieDetailPath = new URL(page.url()).pathname;

    await page.getByRole("button", { name: /Already seen/i }).click();
    await page.getByRole("button", { name: /Interested/i }).click();
    await page.getByRole("button", { name: /Watch again/i }).click();
    await page.getByPlaceholder("Add a short note for everyone").fill(feedbackComment);
    await page.getByRole("button", { name: /save feedback/i }).click();

    await expect(page.getByText(feedbackComment).last()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /a group/i }).click();
    await page.getByRole("button", { name: /start watching/i }).click();
    await expect(page).toHaveURL(/\/watch\/.+/);
    await expect(page.getByRole("heading", { name: /Inception/i }).first()).toBeVisible();

    if (await page.locator("iframe").count()) {
      const playbackFrame = page
        .frames()
        .find((candidate) => candidate !== page.mainFrame() && candidate.url() !== "about:blank");

      if (playbackFrame) {
        await playbackFrame.evaluate((payload) => {
          window.parent.postMessage(payload, "*");
        }, {
          type: "PLAYER_EVENT",
          data: {
            event: "timeupdate",
            currentTime: 125,
            duration: 8880,
            video_id: 27205,
          },
        });

        await expect(page.getByText(/events received:\s*1/i)).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText(/tracked time:\s*2:05/i)).toBeVisible();
      }
    }

    await page.getByRole("button", { name: /mark as finished/i }).click();
    await page.getByRole("button", { name: /save checkpoint/i }).click();
    await expect(page.getByText(/your current member position:\s*2:28:00/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/finished/i).first()).toBeVisible();

    await page.goto("/watch");
    await expect(page.getByRole("heading", { name: /watch sessions/i })).toBeVisible();
    await expect(page.getByText(listName)).toBeVisible();

    await page.goto(`/lists/${listSlug}/select`);
    await expect(page.getByRole("heading", { name: /pick the next movie/i })).toBeVisible();
    await page.getByRole("button", { name: /run automatic mode/i }).click();
    await expect(page.getByText(/latest result/i)).toBeVisible();
    await expect(page.getByText(/selected/i)).toBeVisible({ timeout: 20_000 });

    await page.goto(movieDetailPath);
    await page.getByRole("button", { name: /remove from list/i }).click();
    await expect(page).toHaveURL(new RegExp(`${listPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.locator("a").filter({ hasText: /Inception/i }).first()).toHaveCount(0);

    await monitor.assertClean();
  } finally {
    await cleanupUsersByEmails([user.email]);
  }
});
