"use client";

import { useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { cn } from "@/lib/utils";

type ChoiceOption = {
  value: string;
  label: string;
  hint?: string;
};

type ChoicePillFieldProps = {
  name: string;
  label: string;
  defaultValue: string;
  options: ChoiceOption[];
  description?: string;
  columns?: 2 | 3;
};

export function ChoicePillField({
  name,
  label,
  defaultValue,
  options,
  description,
  columns = 2,
}: ChoicePillFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Field className="space-y-3">
      <input type="hidden" name={name} value={value} />
      <div className="space-y-1">
        <FieldLabel>{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>
      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue(option.value)}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left transition-colors",
                isActive
                  ? "border-foreground/15 bg-secondary text-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:bg-muted/40",
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              {option.hint ? (
                <span className="mt-1 text-xs leading-5">{option.hint}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
