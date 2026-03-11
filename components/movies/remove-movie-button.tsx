"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { removeMovieFromListAction } from "@/features/lists/actions";
import { Button } from "@/components/ui/button";

type RemoveMovieButtonProps = {
  listItemId: string;
  listSlug: string;
};

export function RemoveMovieButton({ listItemId, listSlug }: RemoveMovieButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("listItemId", listItemId);
      formData.set("listSlug", listSlug);

      const result = await removeMovieFromListAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.movieTitle} removed from the list.`);
      router.push(`/lists/${result.listSlug}`);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
      <Trash2 className="size-4" />
      Remove from list
    </Button>
  );
}
