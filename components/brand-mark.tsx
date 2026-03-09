import { Film, UsersRound } from "lucide-react";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
      <span className="relative flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
        <Film className="size-4 text-foreground" />
        <UsersRound className="absolute -right-1 -bottom-1 size-3 rounded-full bg-background text-muted-foreground" />
      </span>
      <span className="flex flex-col leading-none">
        <span>MovieList</span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Collaborative movie rooms
        </span>
      </span>
    </Link>
  );
}
