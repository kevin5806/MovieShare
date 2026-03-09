import { Heart, MessageSquareText, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTmdbScore } from "@/lib/formatters";
import { tmdbImageUrl } from "@/lib/tmdb";
import { formatReleaseDate } from "@/lib/utils";

type MovieCardProps = {
  listSlug: string;
  item: {
    id: string;
    movie: {
      title: string;
      posterPath?: string | null;
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
    <Link href={`/lists/${listSlug}/movies/${item.id}`}>
      <Card className="overflow-hidden border-border/70 bg-card/85 shadow-sm transition-transform hover:-translate-y-0.5">
        <div className="relative aspect-[2/3] bg-muted">
          {item.movie.posterPath ? (
            <Image
              src={tmdbImageUrl(item.movie.posterPath, "w500") ?? ""}
              alt={item.movie.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No poster
            </div>
          )}
        </div>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <p className="line-clamp-1 font-semibold">{item.movie.title}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formatTmdbScore(item.movie.tmdbVoteAverage)}</Badge>
              <Badge variant="secondary">{formatReleaseDate(item.movie.releaseDate)}</Badge>
            </div>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
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
