import { useState } from "react";
import type { FormField } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Paperclip } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readValidation } from "@/lib/form-builder";

export type FormResponses = Record<string, string | string[] | boolean>;

export function validateResponses(fields: FormField[], responses: FormResponses) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = responses[field.id];
    const rules = readValidation(field);
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

    if (field.field_type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
      errors[field.id] = "Enter a valid email address";
    else if (field.field_type === "phone" && !/^[0-9+\-\s()]{7,20}$/.test(value))
      errors[field.id] = "Enter a valid phone number";
    else if (field.field_type === "url" && !/^https?:\/\/\S+$/.test(value))
      errors[field.id] = "Enter a valid URL starting with http";
    else if (field.field_type === "number") {
      const num = Number(value);
      if (value.trim() === "" || Number.isNaN(num)) errors[field.id] = "Enter a number";
      else if (rules.min !== undefined && num < rules.min)
        errors[field.id] = `Must be at least ${rules.min}`;
      else if (rules.max !== undefined && num > rules.max)
        errors[field.id] = `Must be at most ${rules.max}`;
    } else if (
      (field.field_type === "dropdown" || field.field_type === "radio") &&
      field.options.length > 0 &&
      !field.options.includes(value)
    )
      errors[field.id] = "Select one of the available options";

    if (errors[field.id]) continue;

    if (typeof value === "string" && !["file", "resume"].includes(field.field_type)) {
      const maxLength = rules.maxLength ?? 2000;
      if (value.length > maxLength)
        errors[field.id] = `Must be ${maxLength} characters or fewer`;
      else if (rules.minLength !== undefined && value.length < rules.minLength)
        errors[field.id] = `Must be at least ${rules.minLength} characters`;
    }
  }
  for (const field of fields) {
    const value = responses[field.id];
    if (field.field_type === "multi_select" && Array.isArray(value)) {
      const invalid = value.filter((option) => !field.options.includes(option));
      if (invalid.length > 0) errors[field.id] = "Select only the available options";
    }
  }
  return errors;
}

export function DynamicFormField({
  field,
  value,
  error,
  onChange,
  disabled,
  onUpload,
  fromProfile,
}: {
  field: FormField;
  value: string | string[] | boolean | undefined;
  error?: string;
  onChange: (value: string | string[] | boolean) => void;
  disabled?: boolean;
  onUpload?: (file: File) => Promise<string | null>;
  fromProfile?: boolean;
}) {
  const id = `field-${field.id}`;
  const stringValue = typeof value === "string" ? value : "";
  const rules = readValidation(field);
  const [uploading, setUploading] = useState(false);
  const locked = !!disabled;

  async function handleFile(file: File | undefined) {
    if (!file || !onUpload) return;
    setUploading(true);
    const path = await onUpload(file);
    setUploading(false);
    if (path) onChange(path);
  }

  function control() {
    switch (field.field_type) {
      case "long_text":
        return (
          <Textarea
            id={id}
            rows={4}
            disabled={locked}
            placeholder={field.placeholder ?? ""}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "dropdown":
        return (
          <Select value={stringValue} onValueChange={onChange} disabled={locked}>
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
          <RadioGroup value={stringValue} onValueChange={onChange} disabled={locked}>
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
                  disabled={locked}
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
              disabled={locked}
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
            disabled={locked}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "number":
        return (
          <Input
            id={id}
            type="number"
            disabled={locked}
            {...(rules.min !== undefined ? { min: rules.min } : {})}
            {...(rules.max !== undefined ? { max: rules.max } : {})}
            placeholder={field.placeholder ?? ""}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "file":
      case "resume":
        return (
          <div className="space-y-2">
            <Input
              id={id}
              type="file"
              disabled={locked || uploading || !onUpload}
              accept={
                rules.accept ?? (field.field_type === "resume" ? ".pdf,.doc,.docx" : undefined)
              }
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            {uploading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Uploading…
              </p>
            ) : stringValue ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="size-3" />
                {stringValue.split("/").pop()}
              </p>
            ) : null}
          </div>
        );
      default:
        return (
          <Input
            id={id}
            type={field.field_type === "email" ? "email" : "text"}
            disabled={locked}
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
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={id}>
            {field.label}
            {field.required ? <span className="ml-1 text-destructive">*</span> : null}
          </Label>
          {fromProfile ? (
            <Badge variant="secondary" className="text-[10px] font-normal">
              From your profile
            </Badge>
          ) : null}
        </div>
      ) : null}
      {control()}
      {field.help_text ? (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
