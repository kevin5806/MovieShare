import { describe, expect, it } from "vitest";

import {
  formatRuntime,
  formatSeconds,
  initialsFromName,
  slugify,
} from "@/lib/utils";

describe("utils", () => {
  it("slugifies user-facing list names", () => {
    expect(slugify("  Movie Night: Sci-Fi & Chill  ")).toBe("movie-night-sci-fi-chill");
  });

  it("formats runtimes into hours and minutes", () => {
    expect(formatRuntime(125)).toBe("2h 5m");
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(null)).toBe("Runtime unavailable");
  });

  it("formats seconds for minute and hour ranges", () => {
    expect(formatSeconds(95)).toBe("1:35");
    expect(formatSeconds(3671)).toBe("1:01:11");
    expect(formatSeconds(-4)).toBe("0:00");
  });

  it("derives initials from the first two name segments", () => {
    expect(initialsFromName("Ada Lovelace Byron")).toBe("AL");
  });
});
