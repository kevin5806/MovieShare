import { tmdbImageUrl } from "@/lib/tmdb";

type MovieArtwork = {
  posterPath?: string | null;
  posterImageUrl?: string | null;
  backdropPath?: string | null;
  backdropImageUrl?: string | null;
};

export function getMoviePosterUrl(
  movie: MovieArtwork,
  size: "w342" | "w500" | "w780" | "w1280" | "original" = "w500",
) {
  return movie.posterImageUrl || tmdbImageUrl(movie.posterPath, size);
}

export function getMovieBackdropUrl(
  movie: MovieArtwork,
  size: "w342" | "w500" | "w780" | "w1280" | "original" = "w1280",
) {
  return movie.backdropImageUrl || tmdbImageUrl(movie.backdropPath, size);
}
