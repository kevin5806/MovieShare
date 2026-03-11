"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { updateListViewPreferencesAction } from "@/features/lists/actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ListViewControlsProps = {
  listId: string;
  listSlug: string;
  currentSortBy: "RECENT" | "TITLE" | "TMDB_RATING" | "INTEREST" | "COMMENTS";
  currentProposerId: string | null;
  proposers: Array<{
    id: string;
    label: string;
  }>;
};

const sortOptions: Array<{
  value: ListViewControlsProps["currentSortBy"];
  label: string;
}> = [
  { value: "RECENT", label: "Latest" },
  { value: "TITLE", label: "A to Z" },
  { value: "TMDB_RATING", label: "Rating" },
  { value: "INTEREST", label: "Interest" },
  { value: "COMMENTS", label: "Comments" },
];

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm transition-colors",
        active
          ? "border-foreground/15 bg-secondary text-foreground"
          : "border-border/70 bg-background text-muted-foreground hover:bg-muted/35",
      )}
    >
      {children}
    </button>
  );
}

export function ListViewControls({
  listId,
  listSlug,
  currentSortBy,
  currentProposerId,
  proposers,
}: ListViewControlsProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState(currentSortBy);
  const [proposerId, setProposerId] = useState(currentProposerId);
  const [isPending, startTransition] = useTransition();

  function save(nextSortBy: typeof sortBy, nextProposerId: string | null) {
    setSortBy(nextSortBy);
    setProposerId(nextProposerId);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("sortBy", nextSortBy);
      if (nextProposerId) {
        formData.set("proposerId", nextProposerId);
      }

      const result = await updateListViewPreferencesAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-border/70 bg-card/85 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Order</p>
        <Badge variant="secondary">remembered for you</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((option) => (
          <FilterButton
            key={option.value}
            active={sortBy === option.value}
            onClick={() => save(option.value, proposerId)}
          >
            {option.label}
          </FilterButton>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Added by</p>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={proposerId === null}
            onClick={() => save(sortBy, null)}
          >
            Everyone
          </FilterButton>
          {proposers.map((proposer) => (
            <FilterButton
              key={proposer.id}
              active={proposerId === proposer.id}
              onClick={() => save(sortBy, proposer.id)}
            >
              {proposer.label}
            </FilterButton>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending ? "Saving your list view..." : "Your ordering stays the same next time you open this list."}
      </p>
    </div>
  );
}
