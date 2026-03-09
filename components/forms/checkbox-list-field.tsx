import { Field, FieldDescription, FieldLabel } from "@/components/forms/field";
import { Checkbox } from "@/components/ui/checkbox";

type CheckboxListOption = {
  id: string;
  value: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
};

type CheckboxListFieldProps = {
  name: string;
  label: string;
  description?: string;
  options: CheckboxListOption[];
};

export function CheckboxListField({
  name,
  label,
  description,
  options,
}: CheckboxListFieldProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            htmlFor={option.id}
            className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3"
          >
            <Checkbox
              id={option.id}
              name={name}
              value={option.value}
              defaultChecked={option.defaultChecked}
            />
            <div className="space-y-1">
              <span className="text-sm font-medium">{option.label}</span>
              {option.description ? (
                <FieldDescription>{option.description}</FieldDescription>
              ) : null}
            </div>
          </label>
        ))}
      </div>
    </Field>
  );
}
