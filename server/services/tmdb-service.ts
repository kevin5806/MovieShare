import { MovieDataProvider } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { env, isTmdbConfigured } from "@/server/env";

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbSearchMovie = {
  id: number;
  title: string;
  original_title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  vote_average?: number;
};

type TmdbMovieDetails = TmdbSearchMovie & {
  runtime?: number | null;
  genres?: TmdbGenre[];
};

export type MovieSearchResult = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string;
  releaseDate?: string;
  tmdbVoteAverage?: number;
};

async function tmdbFetch<T>(path: string, params?: URLSearchParams) {
  if (!isTmdbConfigured) {
    throw new Error("TMDB_API_TOKEN is not configured.");
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);

  if (params) {
    url.search = params.toString();
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
      Accept: "application/json",
    },
    next: {
      revalidate: 60 * 60,
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function parseReleaseDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export async function searchTmdbMovies(query: string) {
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2 || !isTmdbConfigured) {
    return [] as MovieSearchResult[];
  }

  const response = await tmdbFetch<{ results: TmdbSearchMovie[] }>(
    "/search/movie",
    new URLSearchParams({
      query: trimmed,
      include_adult: "false",
      language: "en-US",
    }),
  );

  return response.results.slice(0, 10).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    overview: movie.overview,
    releaseDate: movie.release_date,
    tmdbVoteAverage: movie.vote_average,
  }));
}

export async function getTmdbMovieDetails(tmdbId: number) {
  const movie = await tmdbFetch<TmdbMovieDetails>(
    `/movie/${tmdbId}`,
    new URLSearchParams({
      language: "en-US",
    }),
  );

  return {
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title ?? null,
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
    overview: movie.overview ?? "",
    runtimeMinutes: movie.runtime ?? null,
    genres: movie.genres ?? [],
    releaseDate: parseReleaseDate(movie.release_date),
    tmdbVoteAverage: movie.vote_average ?? null,
  };
}

export async function cacheMovieFromTmdb(tmdbId: number) {
  const details = await getTmdbMovieDetails(tmdbId);

  return db.movie.upsert({
    where: {
      tmdbId,
    },
    update: {
      title: details.title,
      originalTitle: details.originalTitle,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      overview: details.overview,
      runtimeMinutes: details.runtimeMinutes,
      genres: details.genres,
      releaseDate: details.releaseDate,
      tmdbVoteAverage: details.tmdbVoteAverage,
      dataProvider: MovieDataProvider.TMDB,
      lastSyncedAt: new Date(),
    },
    create: {
      tmdbId,
      title: details.title,
      originalTitle: details.originalTitle,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      overview: details.overview,
      runtimeMinutes: details.runtimeMinutes,
      genres: details.genres,
      releaseDate: details.releaseDate,
      tmdbVoteAverage: details.tmdbVoteAverage,
      dataProvider: MovieDataProvider.TMDB,
    },
  });
}
