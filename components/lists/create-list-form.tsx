import { Plus } from "lucide-react";

import { createListAction } from "@/features/lists/actions";
import { ImageUploadField } from "@/components/media/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateListForm() {
  return (
    <form action={createListAction} className="space-y-3">
      <Input name="name" aria-label="List name" placeholder="Friday picks" required />
      <Textarea
        name="description"
        aria-label="List description"
        placeholder="Add a short description for the group, mood or theme."
      />
      <ImageUploadField
        name="coverImage"
        label="Cover image"
        description="Optional. Give the list a recognizable visual identity from the start."
        previewAlt="New list cover"
        placeholderLabel="No cover image yet"
      />
      <Button type="submit" className="w-full">
        <Plus className="size-4" />
        Create collaborative list
      </Button>
    </form>
  );
}
