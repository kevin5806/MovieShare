"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteListAction } from "@/features/lists/actions";
import { Button } from "@/components/ui/button";

type DeleteListButtonProps = {
  listId: string;
  listSlug: string;
  listName: string;
};

export function DeleteListButton({
  listId,
  listSlug,
  listName,
}: DeleteListButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Delete "${listName}" for every member?`)) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("listId", listId);
      formData.set("listSlug", listSlug);

      const result = await deleteListAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(`${result.listName} deleted.`);
      router.push("/lists");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" onClick={handleClick} disabled={isPending}>
      <Trash2 className="size-4" />
      Delete this list
    </Button>
  );
}
