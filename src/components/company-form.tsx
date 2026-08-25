import { useEffect, useState } from "react";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";

export const COMPANY_SIZES = [
  "1-50",
  "51-200",
  "201-1000",
  "1001-5000",
  "5000+",
] as const;

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .refine(
    (value) => !value || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(value),
    "Enter a valid URL starting with http:// or https://",
  );

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  industry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  company_size: z.string().trim().max(40).optional(),
  website: optionalUrl,
  linkedin_url: optionalUrl,
  logo_url: optionalUrl,
  description: z.string().trim().max(2000).optional(),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address",
    ),
  contact_phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine(
      (value) => !value || /^[+]?[\d\s()-]{7,20}$/.test(value),
      "Enter a valid phone number",
    ),
});

export type CompanyFormValues = z.infer<typeof companySchema> & {
  name: string;
};

export const EMPTY_COMPANY: CompanyFormValues = {
  name: "",
  industry: "",
  location: "",
  company_size: "",
  website: "",
  linkedin_url: "",
  logo_url: "",
  description: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

export function companyToForm(company: Company): CompanyFormValues {
  return {
    name: company.name,
    industry: company.industry ?? "",
    location: company.location ?? "",
    company_size: company.company_size ?? "",
    website: company.website ?? "",
    linkedin_url: company.linkedin_url ?? "",
    logo_url: company.logo_url ?? "",
    description: company.description ?? "",
    contact_name: company.contact_name ?? "",
    contact_email: company.contact_email ?? "",
    contact_phone: company.contact_phone ?? "",
  };
}

export function companyPayload(form: CompanyFormValues) {
  const clean = (value?: string) => (value && value.trim() ? value.trim() : null);
  return {
    name: form.name.trim(),
    industry: clean(form.industry),
    location: clean(form.location),
    company_size: clean(form.company_size),
    website: clean(form.website),
    linkedin_url: clean(form.linkedin_url),
    logo_url: clean(form.logo_url),
    description: clean(form.description),
    contact_name: clean(form.contact_name),
    contact_email: clean(form.contact_email),
    contact_phone: clean(form.contact_phone),
  };
}

export function CompanyLogo({
  name,
  url,
  className,
}: {
  name: string;
  url?: string | null | undefined;
  className?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  if (!url || failed) {
    return (
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg border bg-accent text-sm font-semibold text-accent-foreground",
          className,
        )}
      >
        {initials || <Building2 className="size-5" />}
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`${name} logo`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        "size-12 shrink-0 rounded-lg border bg-card object-contain p-1",
        className,
      )}
    />
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string | undefined;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

export function CompanyFormFields({
  form,
  setForm,
  errors,
}: {
  form: CompanyFormValues;
  setForm: React.Dispatch<React.SetStateAction<CompanyFormValues>>;
  errors: Record<string, string>;
}) {
  const set = (key: keyof CompanyFormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <SectionTitle>Company information</SectionTitle>
        <div className="flex items-start gap-4">
          <CompanyLogo name={form.name || "?"} url={form.logo_url} className="size-16" />
          <Field
            className="flex-1"
            id="logo_url"
            label="Company logo URL"
            placeholder="https://example.com/logo.png"
            value={form.logo_url ?? ""}
            onChange={set("logo_url")}
            error={errors["logo_url"]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="name"
            label="Company name"
            value={form.name}
            onChange={set("name")}
            error={errors["name"]}
          />
          <Field
            id="industry"
            label="Industry"
            placeholder="Software & IT services"
            value={form.industry ?? ""}
            onChange={set("industry")}
            error={errors["industry"]}
          />
          <Field
            id="location"
            label="Headquarters / location"
            placeholder="Bengaluru, India"
            value={form.location ?? ""}
            onChange={set("location")}
            error={errors["location"]}
          />
          <div className="space-y-2">
            <Label htmlFor="company_size">Company size</Label>
            <Select
              value={form.company_size || "unset"}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  company_size: value === "unset" ? "" : value,
                }))
              }
            >
              <SelectTrigger id="company_size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not specified</SelectItem>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size} employees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field
            id="website"
            label="Website"
            placeholder="https://company.com"
            value={form.website ?? ""}
            onChange={set("website")}
            error={errors["website"]}
          />
          <Field
            id="linkedin_url"
            label="LinkedIn / company profile"
            placeholder="https://linkedin.com/company/..."
            value={form.linkedin_url ?? ""}
            onChange={set("linkedin_url")}
            error={errors["linkedin_url"]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Company description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="What the company does, its products and hiring focus."
            value={form.description ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          {errors["description"] ? (
            <p className="text-xs text-destructive">{errors["description"]}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <SectionTitle>Contact information</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="contact_name"
            label="HR / recruiter name"
            value={form.contact_name ?? ""}
            onChange={set("contact_name")}
            error={errors["contact_name"]}
          />
          <Field
            id="contact_email"
            label="HR email"
            type="email"
            placeholder="hr@company.com"
            value={form.contact_email ?? ""}
            onChange={set("contact_email")}
            error={errors["contact_email"]}
          />
          <Field
            id="contact_phone"
            label="HR phone"
            placeholder="+91 98765 43210"
            value={form.contact_phone ?? ""}
            onChange={set("contact_phone")}
            error={errors["contact_phone"]}
          />
        </div>
      </section>
    </div>
  );
}

export function validateCompany(form: CompanyFormValues) {
  const parsed = companySchema.safeParse(form);
  if (parsed.success) return { ok: true as const, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false as const, errors };
}
