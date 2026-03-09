"use client";

import { useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  name: string;
  label: string;
  defaultValue: string;
  options: SelectOption[];
  description?: string;
  placeholder?: string;
};

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  description,
  placeholder,
}: SelectFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Field>
      <input type="hidden" name={name} value={value} />
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue != null) {
            setValue(nextValue);
          }
        }}
      >
        <SelectTrigger className="h-10 w-full rounded-2xl bg-background px-3">
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}
