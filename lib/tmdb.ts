const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(
  path?: string | null,
  size: "w342" | "w500" | "w780" | "original" = "w500",
) {
  if (!path) {
    return null;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
