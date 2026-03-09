"use client";

import { useId, useState } from "react";

import { FieldDescription } from "@/components/forms/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SwitchFieldProps = {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
};

export function SwitchField({
  name,
  label,
  description,
  defaultChecked = false,
  disabled = false,
}: SwitchFieldProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background px-4 py-3",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <div className="space-y-1">
        <span className="block text-sm font-medium leading-5">{label}</span>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={setChecked}
        aria-label={label}
      />
    </label>
  );
}
