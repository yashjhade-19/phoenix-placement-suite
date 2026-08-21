import type { FormField, Student } from "./types";

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "multi_select"
  | "date"
  | "file"
  | "resume";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  url: "URL",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  multi_select: "Multi-select",
  date: "Date",
  file: "File upload",
  resume: "Resume upload",
};

export const FIELD_TYPE_VALUES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

export const OPTION_TYPES: FieldType[] = ["dropdown", "radio", "multi_select"];
export const FILE_TYPES: FieldType[] = ["file", "resume"];

/** Field types that can safely be swapped between each other after responses exist. */
const COMPATIBLE_GROUPS: FieldType[][] = [
  ["short_text", "long_text", "email", "phone", "url"],
  ["dropdown", "radio"],
  ["file", "resume"],
];

export function isTypeChangeSafe(from: string, to: string) {
  if (from === to) return true;
  return COMPATIBLE_GROUPS.some(
    (group) => group.includes(from as FieldType) && group.includes(to as FieldType),
  );
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  maxSizeMb?: number;
  accept?: string;
}

export function readValidation(field: Pick<FormField, "validation">): FieldValidation {
  const raw = field.validation as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as FieldValidation;
}

/* ---------- profile-linked fields ---------- */

export const PROFILE_FIELD_OPTIONS: {
  key: keyof Student;
  label: string;
  type: FieldType;
}[] = [
  { key: "full_name", label: "Full name", type: "short_text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "enrollment_no", label: "Enrollment number", type: "short_text" },
  { key: "course", label: "Course", type: "short_text" },
  { key: "branch", label: "Branch", type: "short_text" },
  { key: "graduation_year", label: "Graduation year", type: "number" },
  { key: "tenth_percentage", label: "10th percentage", type: "number" },
  { key: "twelfth_percentage", label: "12th percentage", type: "number" },
  { key: "diploma_percentage", label: "Diploma percentage", type: "number" },
  { key: "cgpa", label: "CGPA", type: "number" },
  { key: "active_backlogs", label: "Active backlogs", type: "number" },
  { key: "total_backlogs", label: "Total backlogs", type: "number" },
  { key: "skills", label: "Skills", type: "short_text" },
  { key: "certifications", label: "Certifications", type: "long_text" },
  { key: "projects", label: "Projects", type: "long_text" },
  { key: "github_url", label: "GitHub profile", type: "url" },
  { key: "linkedin_url", label: "LinkedIn profile", type: "url" },
  { key: "portfolio_url", label: "Portfolio", type: "url" },
  { key: "resume_url", label: "Resume", type: "resume" },
];

export function profileFieldLabel(key: string | null | undefined) {
  if (!key) return null;
  return PROFILE_FIELD_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function profileValue(
  student: Student | null | undefined,
  key: string | null | undefined,
): string {
  if (!student || !key) return "";
  const value = (student as unknown as Record<string, unknown>)[key];
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Build the initial response map for a student, prefilled from their profile. */
export function buildInitialResponses(
  fields: FormField[],
  student: Student | null | undefined,
) {
  const initial: Record<string, string | string[] | boolean> = {};
  for (const field of fields) {
    if (!field.profile_field) continue;
    const value = profileValue(student, field.profile_field);
    if (value) initial[field.id] = value;
  }
  return initial;
}
