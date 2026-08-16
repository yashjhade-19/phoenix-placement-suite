import type { FormField } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FormResponses = Record<string, string | string[] | boolean>;

export function validateResponses(fields: FormField[], responses: FormResponses) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = responses[field.id];
    const empty =
      value === undefined ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && empty) {
      errors[field.id] = `${field.label} is required`;
      continue;
    }
    if (empty || typeof value !== "string") continue;
    if (value.length > 2000) errors[field.id] = `${field.label} is too long`;
    if (field.field_type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
      errors[field.id] = "Enter a valid email address";
    if (field.field_type === "phone" && !/^[0-9+\-\s()]{7,20}$/.test(value))
      errors[field.id] = "Enter a valid phone number";
    if (field.field_type === "url" && !/^https?:\/\/\S+$/.test(value))
      errors[field.id] = "Enter a valid URL starting with http";
    if (field.field_type === "number" && Number.isNaN(Number(value)))
      errors[field.id] = "Enter a number";
  }
  return errors;
}

export function DynamicFormField({
  field,
  value,
  error,
  onChange,
  disabled,
}: {
  field: FormField;
  value: string | string[] | boolean | undefined;
  error?: string;
  onChange: (value: string | string[] | boolean) => void;
  disabled?: boolean;
}) {
  const id = `field-${field.id}`;
  const stringValue = typeof value === "string" ? value : "";

  function control() {
    switch (field.field_type) {
      case "long_text":
        return (
          <Textarea
            id={id}
            rows={4}
            disabled={disabled}
            placeholder={field.placeholder ?? ""}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "dropdown":
        return (
          <Select value={stringValue} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={id}>
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup value={stringValue} onValueChange={onChange} disabled={disabled}>
            {field.options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem value={option} id={`${id}-${option}`} />
                <Label htmlFor={`${id}-${option}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "multi_select": {
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${id}-${option}`}
                  disabled={disabled}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...selected, option]
                        : selected.filter((item) => item !== option),
                    )
                  }
                />
                <Label htmlFor={`${id}-${option}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={id}
              disabled={disabled}
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={id} className="font-normal">
              {field.placeholder ?? "Yes"}
            </Label>
          </div>
        );
      case "date":
        return (
          <Input
            id={id}
            type="date"
            disabled={disabled}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
        return (
          <Input
            id={id}
            type="number"
            disabled={disabled}
            placeholder={field.placeholder ?? ""}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <Input
            id={id}
            type={field.field_type === "email" ? "email" : "text"}
            disabled={disabled}
            placeholder={field.placeholder ?? ""}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  return (
    <div className="space-y-2">
      {field.field_type !== "checkbox" ? (
        <Label htmlFor={id}>
          {field.label}
          {field.required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
      {control()}
      {field.help_text ? (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
