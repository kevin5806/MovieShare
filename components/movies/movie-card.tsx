import { Heart, MessageSquareText, UserRound } from "lucide-react";
import Link from "next/link";

import { MediaImage } from "@/components/media/media-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTmdbScore } from "@/lib/formatters";
import { getMoviePosterUrl } from "@/lib/movie-images";
import { formatReleaseDate } from "@/lib/utils";

type MovieCardProps = {
  listSlug: string;
  item: {
    id: string;
    movie: {
      title: string;
      posterPath?: string | null;
      posterImageUrl?: string | null;
      releaseDate?: Date | null;
      tmdbVoteAverage?: number | null;
      overview?: string | null;
    };
    addedBy: {
      name: string;
    };
    feedbacks: Array<{
      interest: string;
      comment?: string | null;
    }>;
  };
};

export function MovieCard({ listSlug, item }: MovieCardProps) {
  const interestedCount = item.feedbacks.filter(
    (feedback) => feedback.interest === "INTERESTED",
  ).length;
  const commentsCount = item.feedbacks.filter((feedback) => feedback.comment).length;

  return (
    <Link href={`/lists/${listSlug}/movies/${item.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card/85 shadow-sm transition-transform hover:-translate-y-0.5">
        <div
          data-testid="movie-poster-frame"
          className="relative isolate aspect-[2/3] overflow-hidden bg-muted"
        >
          {getMoviePosterUrl(item.movie) ? (
            <MediaImage
              src={getMoviePosterUrl(item.movie) ?? ""}
              alt={item.movie.title}
              fill
              sizes="(min-width: 1280px) 20rem, (min-width: 640px) 33vw, 100vw"
              data-testid="movie-poster-image"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No poster
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col space-y-4 p-4">
          <div className="space-y-2">
            <p className="line-clamp-1 font-semibold">{item.movie.title}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formatTmdbScore(item.movie.tmdbVoteAverage)}</Badge>
              <Badge variant="secondary">{formatReleaseDate(item.movie.releaseDate)}</Badge>
            </div>
          </div>
          <p className="line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
            {item.movie.overview || "No overview available."}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3.5" />
              {item.addedBy.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" />
              {interestedCount} interested
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3.5" />
              {commentsCount} comments
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
