import { supabase } from "@/integrations/supabase/client";
import type {
  Announcement,
  Application,
  Company,
  Drive,
  EligibilityRule,
  FormField,
  RecruitmentStage,
  Student,
} from "./types";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/* ---------- companies ---------- */
export async function listCompanies() {
  return unwrap<Company[]>(
    await supabase.from("companies").select("*").order("name"),
  );
}

export async function getCompany(id: string) {
  return unwrap<Company>(await supabase.from("companies").select("*").eq("id", id).single());
}

/* ---------- drives ---------- */
export async function listDrives() {
  return unwrap<(Drive & { company: Company | null })[]>(
    await supabase
      .from("drives")
      .select("*, company:companies(*)")
      .order("created_at", { ascending: false }),
  );
}

export async function getDrive(id: string) {
  return unwrap<Drive & { company: Company | null }>(
    await supabase.from("drives").select("*, company:companies(*)").eq("id", id).single(),
  );
}

export async function getDriveRules(driveId: string) {
  return unwrap<EligibilityRule[]>(
    await supabase
      .from("eligibility_rules")
      .select("*")
      .eq("drive_id", driveId)
      .order("group_index"),
  );
}

export async function getDriveFields(driveId: string) {
  return unwrap<FormField[]>(
    await supabase.from("form_fields").select("*").eq("drive_id", driveId).order("sort_order"),
  );
}

export async function getDriveStages(driveId: string) {
  return unwrap<RecruitmentStage[]>(
    await supabase
      .from("recruitment_stages")
      .select("*")
      .eq("drive_id", driveId)
      .order("sort_order"),
  );
}

/* ---------- students ---------- */
export async function listStudents() {
  return unwrap<Student[]>(
    await supabase.from("students").select("*").order("full_name"),
  );
}

export async function getStudent(id: string) {
  return unwrap<Student>(await supabase.from("students").select("*").eq("id", id).single());
}

/* ---------- applications ---------- */
export type ApplicationRow = Application & {
  student: Student | null;
  drive: (Drive & { company: Company | null }) | null;
};

export async function listApplications(filters?: { driveId?: string | undefined; studentId?: string | undefined }) {
  let query = supabase
    .from("applications")
    .select("*, student:students(*), drive:drives(*, company:companies(*))")
    .order("created_at", { ascending: false });
  if (filters?.driveId) query = query.eq("drive_id", filters.driveId);
  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  return unwrap<ApplicationRow[]>(await query);
}

export async function getApplication(id: string) {
  return unwrap<ApplicationRow>(
    await supabase
      .from("applications")
      .select("*, student:students(*), drive:drives(*, company:companies(*))")
      .eq("id", id)
      .single(),
  );
}

export type ApplicationResponseRow = {
  id: string;
  application_id: string;
  field_id: string;
  label: string;
  field_type: string;
  value: unknown;
  created_at: string;
};

export async function getApplicationResponses(applicationId: string) {
  const { data, error } = await supabase
    .from("application_responses")
    .select("*, field:form_fields(sort_order, help_text, profile_field)")
    .eq("application_id", applicationId);
  if (error) throw new Error(error.message);
  return (data ?? []).sort(
    (a, b) => (a.field?.sort_order ?? 0) - (b.field?.sort_order ?? 0),
  ) as (ApplicationResponseRow & {
    field: { sort_order: number; help_text: string | null; profile_field: string | null } | null;
  })[];
}

export async function signedFileUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 120);
  if (error || !data) return null;
  return data.signedUrl;
}



/* ---------- announcements ---------- */
export async function listAnnouncements() {
  return unwrap<(Announcement & { drive: { title: string } | null })[]>(
    await supabase
      .from("announcements")
      .select("*, drive:drives(title)")
      .order("publish_at", { ascending: false }),
  );
}

export function announcementMatchesStudent(
  announcement: Announcement,
  student: Student | null,
  appliedDriveIds: string[],
) {
  if (announcement.expires_at && new Date(announcement.expires_at) < new Date()) return false;
  if (new Date(announcement.publish_at) > new Date()) return false;
  switch (announcement.audience_type) {
    case "branch":
      return !!student && student.branch === announcement.audience_branch;
    case "year":
      return !!student && student.graduation_year === announcement.audience_year;
    case "drive":
      return !!announcement.audience_drive_id &&
        appliedDriveIds.includes(announcement.audience_drive_id);
    default:
      return true;
  }
}
