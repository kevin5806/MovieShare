import { describe, expect, it } from "vitest";

import { getMovieBackdropUrl, getMoviePosterUrl } from "@/lib/movie-images";

describe("movie image helpers", () => {
  it("prefers CDN-backed poster URLs when present", () => {
    expect(
      getMoviePosterUrl({
        posterImageUrl: "https://cdn.example.com/movies/poster.jpg",
        posterPath: "/remote-poster.jpg",
      }),
    ).toBe("https://cdn.example.com/movies/poster.jpg");
  });

  it("falls back to TMDB poster URLs when CDN artwork is missing", () => {
    expect(
      getMoviePosterUrl({
        posterPath: "/remote-poster.jpg",
      }),
    ).toBe("https://image.tmdb.org/t/p/w500/remote-poster.jpg");
  });

  it("prefers CDN-backed backdrop URLs when present", () => {
    expect(
      getMovieBackdropUrl({
        backdropImageUrl: "https://cdn.example.com/movies/backdrop.jpg",
        backdropPath: "/remote-backdrop.jpg",
      }),
    ).toBe("https://cdn.example.com/movies/backdrop.jpg");
  });
});
