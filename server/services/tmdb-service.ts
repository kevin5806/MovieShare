import { MovieDataProvider } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { getTmdbRuntimeConfig } from "@/server/services/system-config";

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
  const tmdbConfig = await getTmdbRuntimeConfig();

  if (!tmdbConfig.apiToken && !tmdbConfig.apiKey) {
    throw new Error("TMDB_API_TOKEN or TMDB_API_KEY is not configured.");
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);

  if (params) {
    url.search = params.toString();
  }

  if (!tmdbConfig.apiToken && tmdbConfig.apiKey) {
    url.searchParams.set("api_key", tmdbConfig.apiKey);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(tmdbConfig.apiToken
        ? {
            Authorization: `Bearer ${tmdbConfig.apiToken}`,
          }
        : {}),
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
  const tmdbConfig = await getTmdbRuntimeConfig();

  if (!trimmed || trimmed.length < 2 || (!tmdbConfig.apiToken && !tmdbConfig.apiKey)) {
    return [] as MovieSearchResult[];
  }

  const response = await tmdbFetch<{ results: TmdbSearchMovie[] }>(
    "/search/movie",
    new URLSearchParams({
      query: trimmed,
      include_adult: "false",
      language: tmdbConfig.language,
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
  const tmdbConfig = await getTmdbRuntimeConfig();
  const movie = await tmdbFetch<TmdbMovieDetails>(
    `/movie/${tmdbId}`,
    new URLSearchParams({
      language: tmdbConfig.language,
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
