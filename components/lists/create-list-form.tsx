import { Plus } from "lucide-react";

import { createListAction } from "@/features/lists/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateListForm() {
  return (
    <form action={createListAction} className="space-y-3">
      <Input name="name" placeholder="Friday picks" required />
      <Textarea
        name="description"
        placeholder="Add a short description for the group, mood or theme."
      />
      <Button type="submit" className="w-full">
        <Plus className="size-4" />
        Create collaborative list
      </Button>
    </form>
  );
}
