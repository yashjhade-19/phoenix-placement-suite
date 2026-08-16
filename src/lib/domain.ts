import type { ApplicationStatus, DriveStatus, Student } from "./types";

export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = {
  draft: "Draft",
  published: "Published",
  applications_open: "Applications Open",
  applications_closed: "Applications Closed",
  selection_in_progress: "Selection In Progress",
  completed: "Completed",
};

export const DRIVE_STATUSES = Object.keys(DRIVE_STATUS_LABELS) as DriveStatus[];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUSES = Object.keys(
  APPLICATION_STATUS_LABELS,
) as ApplicationStatus[];

export const EMPLOYMENT_TYPES: Record<string, string> = {
  full_time: "Full-time",
  internship: "Internship",
  internship_plus_ppo: "Internship + Full-time",
};

export const WORK_MODES: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"];
export const COURSES = ["B.Tech", "M.Tech", "MCA", "BCA", "MBA"];

export const FIELD_TYPES: Record<string, string> = {
  short_text: "Short text",
  long_text: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  dropdown: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  multi_select: "Multi-select",
  date: "Date",
  url: "URL",
  file: "File upload",
  resume: "Resume upload",
};

export const OPTION_FIELD_TYPES = ["dropdown", "radio", "multi_select"];

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} LPA`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isDeadlinePassed(deadline: string | null | undefined) {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

const PROFILE_FIELDS: (keyof Student)[] = [
  "full_name",
  "email",
  "phone",
  "date_of_birth",
  "gender",
  "enrollment_no",
  "course",
  "branch",
  "graduation_year",
  "tenth_percentage",
  "twelfth_percentage",
  "cgpa",
  "skills",
  "resume_url",
  "linkedin_url",
  "github_url",
  "projects",
];

export function profileCompletion(student: Student | null | undefined) {
  if (!student) return 0;
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    const value = student[field];
    if (Array.isArray(value) ? value.length > 0 : value !== null && value !== "")
      filled += 1;
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export function missingProfileFields(student: Student | null | undefined) {
  if (!student) return PROFILE_FIELDS as string[];
  return PROFILE_FIELDS.filter((field) => {
    const value = student[field];
    return Array.isArray(value)
      ? value.length === 0
      : value === null || value === "";
  }).map((f) => f.replace(/_/g, " "));
}
