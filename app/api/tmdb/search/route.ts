import { NextResponse } from "next/server";

import { searchTmdbMovies } from "@/server/services/tmdb-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "";

  try {
    const results = await searchTmdbMovies(query);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to search TMDB right now.",
      },
      { status: 500 },
    );
  }
}
