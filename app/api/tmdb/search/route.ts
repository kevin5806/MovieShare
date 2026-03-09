import { NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { searchTmdbMovies } from "@/server/services/tmdb-service";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
