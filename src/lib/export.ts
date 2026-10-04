import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function toCsv(header: string[], rows: unknown[][]) {
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  // BOM so Excel opens UTF-8 names correctly
  downloadBlob(new Blob(["\uFEFF" + toCsv(header, rows)], { type: "text/csv;charset=utf-8" }), filename);
}

const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "file";

/** Builds a recruiter dossier ZIP: summary CSV with full profiles + resumes folder. */
export async function downloadDossier(
  applicationIds: string[],
  title: string,
  onProgress?: (done: number, total: number) => void,
) {
  const { data: apps, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, current_stage:recruitment_stages!applications_current_stage_id_fkey(name), drive:drives(title, company:companies(name)), student:students(*, student_projects(title), student_certifications(name, issuer)), application_responses(label, value)",
    )
    .in("id", applicationIds);
  if (error) throw new Error(error.message);
  const list = apps ?? [];
  const zip = new JSZip();
  const folder = zip.folder("resumes")!;
  const resumeFile = new Map<string, string>();
  let done = 0;
  for (const a of list) {
    const s = a.student;
    if (s?.resume_url) {
      const { data } = await supabase.storage.from("resumes").download(s.resume_url);
      if (data) {
        const ext = s.resume_url.split(".").pop() ?? "pdf";
        const name = `${safe(s.enrollment_no)}_${safe(s.full_name)}_Resume.${ext}`;
        folder.file(name, data);
        resumeFile.set(a.id, name);
      }
    }
    onProgress?.(++done, list.length);
  }
  const questions = [...new Set(list.flatMap((a) => (a.application_responses ?? []).map((r) => r.label)))];
  const header = [
    "Name", "Enrollment", "Email", "Phone", "Course", "Branch", "Graduation year", "CGPA", "10th %", "12th %",
    "Diploma %", "Active backlogs", "Total backlogs", "Academic verification", "Skills", "Projects",
    "Certifications", "LinkedIn", "GitHub", "Portfolio", "Drive", "Company", "Status", "Current round",
    "Resume file", ...questions,
  ];
  const rows = list.map((a) => {
    const s = a.student;
    const resp = new Map((a.application_responses ?? []).map((r) => [r.label, r.value]));
    const fmt = (v: unknown) => (Array.isArray(v) ? v.join("; ") : v && typeof v === "object" ? JSON.stringify(v) : v);
    return [
      s?.full_name, s?.enrollment_no, s?.email, s?.phone, s?.course, s?.branch, s?.graduation_year, s?.cgpa,
      s?.tenth_percentage, s?.twelfth_percentage, s?.diploma_percentage, s?.active_backlogs, s?.total_backlogs,
      s?.academic_verification_status?.replace(/_/g, " "), (s?.skills ?? []).join("; "),
      (s?.student_projects ?? []).map((p) => p.title).join("; "),
      (s?.student_certifications ?? []).map((c) => (c.issuer ? `${c.name} (${c.issuer})` : c.name)).join("; "),
      s?.linkedin_url, s?.github_url, s?.portfolio_url, a.drive?.title, a.drive?.company?.name,
      a.status.replace(/_/g, " "), a.current_stage?.name, resumeFile.get(a.id) ?? "Not uploaded",
      ...questions.map((q) => fmt(resp.get(q))),
    ];
  });
  zip.file("Candidates_Summary.csv", "\uFEFF" + toCsv(header, rows));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${safe(title)}_Dossier.zip`);
  return { total: list.length, resumes: resumeFile.size };
}
