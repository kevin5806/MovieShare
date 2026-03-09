import Link from "next/link";

import { MediaImage } from "@/components/media/media-image";
import { Badge } from "@/components/ui/badge";

type ListMembershipCardProps = {
  membership: {
    role: string;
    list: {
      slug: string;
      name: string;
      description: string | null;
      coverImageUrl?: string | null;
      _count: {
        items: number;
        members: number;
      };
    };
  };
  showOwner?: boolean;
  ownerLabel?: string | null;
  highlightLive?: boolean;
};

export function ListMembershipCard({
  membership,
  showOwner = false,
  ownerLabel,
  highlightLive = false,
}: ListMembershipCardProps) {
  return (
    <Link
      href={`/lists/${membership.list.slug}`}
      className="overflow-hidden rounded-3xl border border-border/70 bg-background transition-colors hover:bg-accent/50"
    >
      <div className="relative min-h-28 border-b border-border/70 bg-muted/30">
        {membership.list.coverImageUrl ? (
          <MediaImage
            src={membership.list.coverImageUrl}
            alt={membership.list.name}
            fill
            sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(248,250,252,0.9))]" />
        <div className="relative flex h-full items-start justify-between gap-3 p-4">
          {showOwner && ownerLabel ? <Badge variant="secondary">{ownerLabel}</Badge> : <span />}
          <div className="flex flex-wrap justify-end gap-2">
            {highlightLive ? <Badge>Live</Badge> : null}
            <Badge>{membership.role}</Badge>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="font-semibold">{membership.list.name}</p>
          <p className="text-sm text-muted-foreground">
            {membership.list.description || "No description yet."}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{membership.list._count.items} movies</span>
          <span>{membership.list._count.members} members</span>
        </div>
      </div>
    </Link>
  );
}
