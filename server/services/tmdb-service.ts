import { MovieDataProvider } from "@/generated/prisma/client";
import { tmdbImageUrl } from "@/lib/tmdb";
import { db } from "@/server/db";
import {
  deleteManagedImageByUrl,
  isMediaStorageConfigured,
  mirrorRemoteImageToStorage,
} from "@/server/services/media-storage";
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

type CachedMovieArtwork = {
  id: string;
  tmdbId: number;
  posterPath?: string | null;
  posterImageUrl?: string | null;
  backdropPath?: string | null;
  backdropImageUrl?: string | null;
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

function getArtworkStem(path: string | null | undefined, fallback: string) {
  const basename = path?.split("/").pop()?.split(".").slice(0, -1).join("-");
  return basename || fallback;
}

async function syncMovieArtworkAsset(input: {
  tmdbId: number;
  kind: "poster" | "backdrop";
  path: string | null | undefined;
  previousUrl?: string | null;
}) {
  if (!input.path || !isMediaStorageConfigured()) {
    if (!input.path && input.previousUrl) {
      await deleteManagedImageByUrl(input.previousUrl).catch((error) => {
        console.error("deleteManagedImageByUrl failed", error);
      });
    }

    return input.path ? input.previousUrl ?? null : null;
  }

  const sourceUrl = tmdbImageUrl(
    input.path,
    input.kind === "poster" ? "w780" : "w1280",
  );

  if (!sourceUrl) {
    return input.previousUrl ?? null;
  }

  try {
    const mirrored = await mirrorRemoteImageToStorage({
      sourceUrl,
      folder: "movies",
      ownerId: `tmdb-${input.tmdbId}`,
      filenameStem: `${input.kind}-${getArtworkStem(input.path, `${input.kind}-${input.tmdbId}`)}`,
      previousUrl: input.previousUrl,
    });

    return mirrored?.url ?? input.previousUrl ?? null;
  } catch (error) {
    console.error(`syncMovieArtworkAsset failed for ${input.kind}`, error);
    return input.previousUrl ?? null;
  }
}

export async function syncMovieArtwork<T extends CachedMovieArtwork>(movie: T): Promise<T> {
  const [posterImageUrl, backdropImageUrl] = await Promise.all([
    syncMovieArtworkAsset({
      tmdbId: movie.tmdbId,
      kind: "poster",
      path: movie.posterPath,
      previousUrl: movie.posterImageUrl,
    }),
    syncMovieArtworkAsset({
      tmdbId: movie.tmdbId,
      kind: "backdrop",
      path: movie.backdropPath,
      previousUrl: movie.backdropImageUrl,
    }),
  ]);

  if (
    posterImageUrl === (movie.posterImageUrl ?? null) &&
    backdropImageUrl === (movie.backdropImageUrl ?? null)
  ) {
    return movie;
  }

  await db.movie.update({
    where: {
      id: movie.id,
    },
    data: {
      posterImageUrl,
      backdropImageUrl,
    },
  });

  return {
    ...movie,
    posterImageUrl,
    backdropImageUrl,
  };
}

export async function syncMovieArtworkBatch<T extends CachedMovieArtwork>(movies: T[]) {
  const uniqueMovies = [...new Map(movies.map((movie) => [movie.id, movie])).values()];
  const syncedMovies = await Promise.all(uniqueMovies.map((movie) => syncMovieArtwork(movie)));
  return new Map(syncedMovies.map((movie) => [movie.id, movie]));
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
  const movie = await db.movie.upsert({
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

  return syncMovieArtwork(movie);
}
