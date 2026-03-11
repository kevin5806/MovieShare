"use client";

import { ImageIcon, Upload, XCircle } from "lucide-react";
import { useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { MediaImage } from "@/components/media/media-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn, initialsFromName } from "@/lib/utils";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  description: string;
  previewUrl?: string | null;
  previewAlt: string;
  placeholderLabel: string;
  variant?: "avatar" | "cover";
  removeName?: string;
  removeLabel?: string;
};

export function ImageUploadField({
  name,
  label,
  description,
  previewUrl,
  previewAlt,
  placeholderLabel,
  variant = "cover",
  removeName,
  removeLabel = "Remove current image",
}: ImageUploadFieldProps) {
  const [removeRequested, setRemoveRequested] = useState(false);
  const hasPreview = Boolean(previewUrl) && !removeRequested;
  const acceptedFormats = "JPG, PNG or WebP up to 5 MB.";

  return (
    <Field className="space-y-3">
      <div className="space-y-1">
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </div>

      {variant === "avatar" ? (
        <div className="flex items-center gap-4 rounded-[28px] border border-border/70 bg-muted/25 p-4">
          <Avatar className="size-20 border border-border/70 bg-card shadow-sm" size="lg">
            {hasPreview ? <AvatarImage src={previewUrl ?? undefined} alt={previewAlt} /> : null}
            <AvatarFallback>{initialsFromName(placeholderLabel)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {hasPreview ? "Current profile image" : "No profile image yet"}
            </p>
            <p>{acceptedFormats}</p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "relative overflow-hidden rounded-[28px] border border-border/70 bg-muted/25 p-4",
            "min-h-36",
          )}
        >
          {hasPreview ? (
            <MediaImage
              src={previewUrl!}
              alt={previewAlt}
              fill
              sizes="(min-width: 1280px) 28rem, 100vw"
              className="absolute inset-0 !h-full !w-full object-cover"
            />
          ) : null}
          <div className="relative z-10 flex min-h-28 items-end">
            <div className="rounded-2xl bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur">
              <p className="font-medium text-foreground">
                {hasPreview ? "Current cover image" : placeholderLabel}
              </p>
              <p className="text-muted-foreground">{acceptedFormats}</p>
            </div>
          </div>
          {!hasPreview ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>
          ) : null}
        </div>
      )}

      <label
        htmlFor={name}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-background px-4 py-3 text-sm transition-colors hover:bg-muted/35"
      >
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {variant === "avatar" ? "Choose a profile image" : "Choose a cover image"}
          </p>
          <p className="text-muted-foreground">{acceptedFormats}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground">
          <Upload className="size-3.5" />
          Browse
        </span>
      </label>
      <Input
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
      />

      {removeName ? <input type="hidden" name={removeName} value={removeRequested ? "true" : "false"} /> : null}

      {removeName && previewUrl ? (
        <button
          type="button"
          onClick={() => setRemoveRequested((current) => !current)}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/35"
        >
          <XCircle className="size-4" />
          {removeRequested ? "Keep current image" : removeLabel}
        </button>
      ) : null}
    </Field>
  );
}
