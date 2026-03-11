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
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      try {
        setIsSearching(true);

        const response = await fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        const payload = (await response.json()) as {
          results?: SearchResult[];
          error?: string;
        };

        if (!response.ok) {
          toast.error(payload.error ?? "Unable to search right now.");
          return;
        }

        setResults(payload.results ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        toast.error("Unable to search right now.");
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    void runSearch();

    return () => controller.abort();
  }, [deferredQuery]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setIsSearching(false);
    }
  }, [open]);

  const visibleResults = deferredQuery.trim().length < 2 ? [] : results;

  function handleAddMovie(result: SearchResult) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);
      formData.set("tmdbId", String(result.tmdbId));

      const response = await addMovieToListAction(formData);

      if (!response.ok) {
        toast.error(response.error);
        return;
      }

      toast.success(`${result.title} added to the list.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="size-4" />
        Add a title
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Add a movie</DialogTitle>
          <DialogDescription>
            Search for a title and add it to the list in a couple of clicks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 px-6 pb-6">
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search movies"
              className="pl-10"
              placeholder="Search by title or year"
            />
          </div>

          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {isSearching ? (
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Searching...
              </div>
            ) : visibleResults.length ? (
              visibleResults.map((result) => (
                <button
                  key={result.tmdbId}
                  type="button"
                  onClick={() => handleAddMovie(result)}
                  disabled={isPending}
                  className="grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-stretch gap-4 rounded-3xl border border-border/70 bg-card/85 p-4 text-left transition-colors hover:bg-accent/60 disabled:opacity-60"
                >
                  <div
                    data-testid="search-result-poster-frame"
                    className="relative isolate aspect-[2/3] h-full min-h-32 overflow-hidden rounded-[18px] bg-muted"
                  >
                    {result.posterPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={result.title}
                        src={tmdbImageUrl(result.posterPath, "w342") ?? undefined}
                        data-testid="search-result-poster-image"
                        className="absolute inset-0 !h-full !w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center space-y-2">
                    <div className="space-y-1">
                      <p className="line-clamp-1 font-medium">{result.title}</p>
                      {result.originalTitle && result.originalTitle !== result.title ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          Original: {result.originalTitle}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.releaseDate || "Release date unavailable"}
                    </p>
                    <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {result.overview || "No overview available."}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
                Start typing to search for a movie.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
