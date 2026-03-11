import { expect, type Page } from "@playwright/test";

import type { TestIdentity } from "./test-data";

export const TEST_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

type DiscoverResponse = {
  mode?: "sign-in" | "sign-up";
  error?: string;
};

type BetterAuthResponse = {
  error?: {
    message?: string;
  };
};

async function waitForJsonResponse<T>(
  page: Page,
  options: {
    path: string;
    timeoutMs?: number;
  },
) {
  const response = await page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" && candidate.url().includes(options.path),
    {
      timeout: options.timeoutMs ?? 20_000,
    },
  );
  const text = await response.text().catch(() => "");
  let payload: T | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as T;
    } catch {
      payload = null;
    }
  }

  return {
    response,
    payload,
    text,
  };
}

async function assertDashboardSession(page: Page) {
  if (!/\/dashboard$/.test(page.url())) {
    await page.goto("/dashboard");
  }

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByText(/your shared movie rooms/i)).toBeVisible({ timeout: 20_000 });
}

function buildAuthErrorMessage(input: {
  action: "sign-in" | "sign-up";
  email: string;
  payload: BetterAuthResponse | null;
  responseText: string;
}) {
  return (
    (input.payload?.error?.message ?? input.responseText) ||
    `Unable to ${input.action} ${input.email}.`
  );
}

export async function registerViaAccessFlow(page: Page, user: TestIdentity) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  const discoverPromise = waitForJsonResponse<DiscoverResponse>(page, {
    path: "/api/auth/discover",
  });
  const signInPromise = waitForJsonResponse<BetterAuthResponse>(page, {
    path: "/api/auth/sign-in/email",
  }).catch(() => null);
  await page.getByRole("button", { name: /^Continue$/ }).click();
  const discover = await discoverPromise;

  if (!discover.response.ok()) {
    throw new Error(
      (discover.payload?.error ?? discover.text) ||
        `Unable to discover access mode for ${user.email}.`,
    );
  }

  if (discover.payload?.mode === "sign-in") {
    const signIn = await signInPromise;

    if (!signIn) {
      throw new Error(`Sign-in request was not observed for ${user.email}.`);
    }

    if (!signIn.response.ok() || signIn.payload?.error) {
      throw new Error(
        buildAuthErrorMessage({
          action: "sign-in",
          email: user.email,
          payload: signIn.payload,
          responseText: signIn.text,
        }),
      );
    }

    await assertDashboardSession(page);
    return;
  }

  await expect(page.getByRole("heading", { name: /this email is new here/i })).toBeVisible();
  await page.getByLabel("Name").fill(user.name);
  const signUpPromise = waitForJsonResponse<BetterAuthResponse>(page, {
    path: "/api/auth/sign-up/email",
  });
  await page.getByRole("button", { name: /create account and continue/i }).click();
  const signUp = await signUpPromise;

  if (!signUp.response.ok() || signUp.payload?.error) {
    throw new Error(
      buildAuthErrorMessage({
        action: "sign-up",
        email: user.email,
        payload: signUp.payload,
        responseText: signUp.text,
      }),
    );
  }

  await assertDashboardSession(page);
}

export async function loginViaAccessFlow(page: Page, user: TestIdentity) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  const discoverPromise = waitForJsonResponse<DiscoverResponse>(page, {
    path: "/api/auth/discover",
  });
  const signInPromise = waitForJsonResponse<BetterAuthResponse>(page, {
    path: "/api/auth/sign-in/email",
  });
  await page.getByRole("button", { name: /^Continue$/ }).click();
  const discover = await discoverPromise;

  if (!discover.response.ok()) {
    throw new Error(
      (discover.payload?.error ?? discover.text) ||
        `Unable to discover access mode for ${user.email}.`,
    );
  }

  if (discover.payload?.mode === "sign-up") {
    throw new Error(`Expected an existing account for ${user.email}, but discover returned sign-up.`);
  }

  const signIn = await signInPromise;

  if (!signIn.response.ok() || signIn.payload?.error) {
    throw new Error(
      buildAuthErrorMessage({
        action: "sign-in",
        email: user.email,
        payload: signIn.payload,
        responseText: signIn.text,
      }),
    );
  }

  await assertDashboardSession(page);
}

export async function logoutFromShell(page: Page) {
  await page.getByRole("button", { name: /open account menu/i }).click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function createIsolatedPage(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext({
    baseURL: TEST_BASE_URL,
  });
  const page = await context.newPage();

  return {
    context,
    page,
  };
}
