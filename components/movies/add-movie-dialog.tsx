"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { LoaderCircle, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addMovieToListAction } from "@/features/lists/actions";
import { tmdbImageUrl } from "@/lib/tmdb";
import { buttonVariants } from "@/components/ui/button-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchResult = {
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  posterPath?: string | null;
  releaseDate?: string;
  overview?: string;
};

export function AddMovieDialog({
  listId,
  listSlug,
}: {
  listId: string;
  listSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const trimmed = deferredQuery.trim();

    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      setIsSearching(true);

      const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });

      const payload = (await response.json()) as {
        results?: SearchResult[];
        error?: string;
      };

      setIsSearching(false);

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to search TMDB.");
        return;
      }

      setResults(payload.results ?? []);
    }

    void runSearch();

    return () => controller.abort();
  }, [deferredQuery]);

  const visibleResults = deferredQuery.trim().length < 2 ? [] : results;

  function handleAddMovie(result: SearchResult) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("tmdbId", String(result.tmdbId));

      await addMovieToListAction(formData);
      toast.success(`${result.title} added to the list.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Add movie from TMDB
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a movie</DialogTitle>
          <DialogDescription>
            Search TMDB and save only the metadata needed by your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-10"
              placeholder="Search for a title, director-adjacent title, or year"
            />
          </div>

          <div className="space-y-2">
            {isSearching ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Searching TMDB...
              </div>
            ) : visibleResults.length ? (
              visibleResults.map((result) => (
                <button
                  key={result.tmdbId}
                  type="button"
                  onClick={() => handleAddMovie(result)}
                  disabled={isPending}
                  className="flex w-full items-start gap-4 rounded-3xl border border-border/70 bg-card/85 p-4 text-left transition-colors hover:bg-accent/60 disabled:opacity-60"
                >
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    {result.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={result.title}
                        src={tmdbImageUrl(result.posterPath, "w342") ?? undefined}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{result.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.releaseDate || "Release date unavailable"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {result.overview || "No overview available."}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
                Start typing to search TMDB.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
