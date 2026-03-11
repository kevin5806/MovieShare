import { Save } from "lucide-react";

import { updateListPresentationAction } from "@/features/lists/actions";
import { ImageUploadField } from "@/components/media/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ListPresentationFormProps = {
  list: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    coverImageUrl: string | null;
  };
};

export function ListPresentationForm({ list }: ListPresentationFormProps) {
  return (
    <form action={updateListPresentationAction} className="space-y-4">
      <input type="hidden" name="listId" value={list.id} />
      <input type="hidden" name="listSlug" value={list.slug} />
      <Input
        name="name"
        aria-label="List presentation name"
        defaultValue={list.name}
        placeholder="List name"
        required
      />
      <Textarea
        name="description"
        aria-label="List presentation description"
        defaultValue={list.description ?? ""}
        placeholder="Describe the list mood, rules or context."
      />
      <ImageUploadField
        name="coverImage"
        label="Cover image"
        description="Shown on the dashboard, list header and other shared surfaces."
        previewUrl={list.coverImageUrl}
        previewAlt={list.name}
        placeholderLabel="No cover image yet"
        removeName="removeCoverImage"
        removeLabel="Remove cover image"
      />
      <Button type="submit" className="w-full">
        <Save className="size-4" />
        Save list presentation
      </Button>
    </form>
  );
}
