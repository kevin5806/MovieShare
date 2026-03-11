import { expect, type Locator, type Page } from "@playwright/test";

export async function createList(page: Page, input: { name: string; description: string }) {
  await page.goto("/lists");
  await expect(page.getByRole("heading", { name: /^Lists$/ })).toBeVisible();
  await page.getByLabel("List name").fill(input.name);
  await page.getByLabel("List description").fill(input.description);
  await page.getByRole("button", { name: /create collaborative list/i }).click();

  await expect(page).toHaveURL(/\/lists\/.+/);
  await expect(page.getByRole("heading", { name: input.name })).toBeVisible();
}

export async function addMovieFromTmdb(page: Page, query: string, expectedTitle: RegExp) {
  await page.getByRole("button", { name: /add a title/i }).click();
  const searchInput = page.getByLabel("Search movies");

  await expect(searchInput).toBeVisible();
  await searchInput.fill(query);

  const resultButton = page.getByRole("button", { name: expectedTitle }).first();
  await expect(resultButton).toBeVisible({ timeout: 20_000 });
  await resultButton.click();

  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 20_000 });
}

export async function openMovieDetail(page: Page, title: RegExp) {
  await page.locator("a").filter({ hasText: title }).first().click();
  await expect(page).toHaveURL(/\/movies\/.+/);
}

export async function chooseSelectOption(
  page: Page,
  triggerLabel: string,
  optionLabel: string,
) {
  await page.locator(`[aria-label="${triggerLabel}"]`).click();
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: optionLabel })
    .first()
    .click();
}

export async function expectImageToFillFrame(frame: Locator, image: Locator) {
  await expect(frame).toBeVisible();
  await expect(image).toBeVisible();

  await expect
    .poll(async () => {
      return image.evaluate((node) => {
        if (!(node instanceof HTMLImageElement)) {
          return false;
        }

        return node.complete;
      });
    })
    .toBe(true);

  const frameBox = await frame.boundingBox();
  const imageBox = await image.boundingBox();

  expect(frameBox).not.toBeNull();
  expect(imageBox).not.toBeNull();

  expect(await image.evaluate((node) => getComputedStyle(node).objectFit)).toBe("cover");

  expect(Math.abs((imageBox?.width ?? 0) - (frameBox?.width ?? 0))).toBeLessThanOrEqual(1.5);
  expect(Math.abs((imageBox?.height ?? 0) - (frameBox?.height ?? 0))).toBeLessThanOrEqual(1.5);
}
