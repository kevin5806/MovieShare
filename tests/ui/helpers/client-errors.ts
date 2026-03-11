import { expect, type Page } from "@playwright/test";

const ignoredRequestFailurePatterns = [/ERR_ABORTED/i, /aborted/i];

export function monitorClientErrors(page: Page, label: string) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    errors.push(`console: ${message.text()}`);
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "unknown";

    if (!url.startsWith("http://127.0.0.1:3000") && !url.startsWith("http://localhost:3000")) {
      return;
    }

    if (ignoredRequestFailurePatterns.some((pattern) => pattern.test(failure))) {
      return;
    }

    errors.push(`requestfailed: ${request.method()} ${url} ${failure}`);
  });

  return {
    async assertClean() {
      expect(errors, `${label} should not produce uncaught client-side errors`).toEqual([]);
    },
  };
}
