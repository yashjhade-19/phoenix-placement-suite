import { z } from "zod";

export const IMPORT_COLUMNS = [
  { header: "Full Name", key: "full_name", required: true },
  { header: "Enrollment Number", key: "enrollment_no", required: true },
  { header: "Email", key: "email", required: true },
  { header: "Phone", key: "phone", required: false },
  { header: "Course", key: "course", required: true },
  { header: "Branch", key: "branch", required: true },
  { header: "Graduation Year", key: "graduation_year", required: true },
  { header: "CGPA", key: "cgpa", required: true },
  { header: "10th Percentage", key: "tenth_percentage", required: true },
  { header: "12th Percentage", key: "twelfth_percentage", required: true },
  { header: "Diploma Percentage", key: "diploma_percentage", required: false },
  { header: "Active Backlogs", key: "active_backlogs", required: true },
  { header: "Total Backlogs", key: "total_backlogs", required: true },
] as const;

export const SAMPLE_CSV = [
  IMPORT_COLUMNS.map((c) => c.header).join(","),
  "Ananya Rao,NIT2027CS101,ananya.rao@example.edu,9876543210,B.Tech,CSE,2027,8.6,92,89,,0,0",
  "Rohit Mehta,NIT2027IT045,rohit.mehta@example.edu,,B.Tech,IT,2027,7.4,85,78,,1,2",
].join("\n");

export type ImportRecord = {
  full_name: string;
  enrollment_no: string;
  email: string;
  phone: string | null;
  course: string;
  branch: string;
  graduation_year: number;
  cgpa: number;
  tenth_percentage: number;
  twelfth_percentage: number;
  diploma_percentage: number | null;
  active_backlogs: number;
  total_backlogs: number;
};

export type ImportKey = (typeof IMPORT_COLUMNS)[number]["key"];
export type ImportRow = {
  line: number;
  raw: Record<ImportKey, string>;
  record: ImportRecord | null;
  errors: string[];
  duplicate: boolean; // conflicts with an existing student → skipped
};

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const emailSchema = z.string().email().max(255);

function numberIn(value: string, label: string, min: number, max: number, errors: string[], int = false) {
  const n = Number(value);
  if (value === "" || Number.isNaN(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    errors.push(`Invalid ${label}${value ? ` "${value}"` : ""}`);
    return null;
  }
  return n;
}

export function validateImport(
  text: string,
  existing: { email: string; enrollment_no: string }[],
): { rows: ImportRow[]; missingColumns: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], missingColumns: IMPORT_COLUMNS.map((c) => c.header) };
  const headers = table[0]!.map(norm);
  const index: Record<string, number> = {};
  for (const col of IMPORT_COLUMNS) {
    const i = headers.indexOf(norm(col.header));
    if (i >= 0) index[col.key] = i;
  }
  const missingColumns = IMPORT_COLUMNS.filter((c) => c.required && index[c.key] === undefined).map(
    (c) => c.header,
  );
  if (missingColumns.length) return { rows: [], missingColumns };

  const existingEmails = new Set(existing.map((s) => s.email.trim().toLowerCase()));
  const existingEnroll = new Set(existing.map((s) => s.enrollment_no.trim().toLowerCase()));
  const seenEmails = new Map<string, number>();
  const seenEnroll = new Map<string, number>();
  const year = new Date().getFullYear();

  const rows = table.slice(1).map((cells, i): ImportRow => {
    const line = i + 2;
    const raw = {} as Record<ImportKey, string>;
    for (const col of IMPORT_COLUMNS) raw[col.key] = (cells[index[col.key] ?? -1] ?? "").trim();
    const errors: string[] = [];
    let duplicate = false;

    if (raw.full_name!.length < 2) errors.push("Missing full name");
    if (!raw.enrollment_no) errors.push("Missing enrollment number");
    if (!raw.email) errors.push("Missing email");
    else if (!emailSchema.safeParse(raw.email).success) errors.push(`Invalid email "${raw.email}"`);
    if (!raw.course) errors.push("Missing course");
    if (!raw.branch) errors.push("Missing branch");
    if (raw.phone && !/^[+\d][\d\s-]{6,19}$/.test(raw.phone)) errors.push(`Invalid phone "${raw.phone}"`);

    const graduation_year = numberIn(raw.graduation_year!, "graduation year", 2000, year + 8, errors, true);
    const cgpa = numberIn(raw.cgpa!, "CGPA", 0, 10, errors);
    const tenth = numberIn(raw.tenth_percentage!, "10th percentage", 0, 100, errors);
    const twelfth = numberIn(raw.twelfth_percentage!, "12th percentage", 0, 100, errors);
    const diploma = raw.diploma_percentage
      ? numberIn(raw.diploma_percentage, "diploma percentage", 0, 100, errors)
      : null;
    const active = numberIn(raw.active_backlogs!, "active backlogs", 0, 50, errors, true);
    const total = numberIn(raw.total_backlogs!, "total backlogs", 0, 50, errors, true);
    if (active !== null && total !== null && active > total)
      errors.push("Active backlogs cannot exceed total backlogs");

    const email = raw.email!.toLowerCase();
    const enroll = raw.enrollment_no!.toLowerCase();
    if (enroll && seenEnroll.has(enroll))
      errors.push(`Duplicate enrollment number (same as row ${seenEnroll.get(enroll)})`);
    if (email && seenEmails.has(email)) errors.push(`Duplicate email (same as row ${seenEmails.get(email)})`);
    if (enroll && !seenEnroll.has(enroll)) seenEnroll.set(enroll, line);
    if (email && !seenEmails.has(email)) seenEmails.set(email, line);

    if (enroll && existingEnroll.has(enroll)) {
      errors.push("Enrollment number already exists — skipped");
      duplicate = true;
    }
    if (email && existingEmails.has(email)) {
      errors.push("Email already belongs to an existing student — skipped");
      duplicate = true;
    }

    const record: ImportRecord | null =
      errors.length === 0
        ? {
            full_name: raw.full_name!.slice(0, 100),
            enrollment_no: raw.enrollment_no!.slice(0, 40),
            email,
            phone: raw.phone || null,
            course: raw.course!.slice(0, 60),
            branch: raw.branch!.slice(0, 60),
            graduation_year: graduation_year!,
            cgpa: cgpa!,
            tenth_percentage: tenth!,
            twelfth_percentage: twelfth!,
            diploma_percentage: diploma,
            active_backlogs: active!,
            total_backlogs: total!,
          }
        : null;
    return { line, raw, record, errors, duplicate };
  });
  return { rows, missingColumns };
}
