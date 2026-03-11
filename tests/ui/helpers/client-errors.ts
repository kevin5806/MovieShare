import { expect, type Page } from "@playwright/test";

const ignoredRequestFailurePatterns = [/ERR_ABORTED/i, /aborted/i];

type ClientErrorMonitorOptions = {
  ignoreConsolePatterns?: RegExp[];
  ignorePageErrorPatterns?: RegExp[];
};

export function monitorClientErrors(
  page: Page,
  label: string,
  options: ClientErrorMonitorOptions = {},
) {
  const errors: string[] = [];
  const ignoreConsolePatterns = options.ignoreConsolePatterns ?? [];
  const ignorePageErrorPatterns = options.ignorePageErrorPatterns ?? [];

  page.on("pageerror", (error) => {
    if (ignorePageErrorPatterns.some((pattern) => pattern.test(error.message))) {
      return;
    }

    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    if (ignoreConsolePatterns.some((pattern) => pattern.test(text))) {
      return;
    }

    errors.push(`console: ${text}`);
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
