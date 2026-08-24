import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCHES, COURSES, profileCompletion } from "@/lib/domain";
import type { Student } from "@/lib/types";

export const Route = createFileRoute("/_app/profile")({
  component: StudentProfile,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional(),
  enrollment_no: z.string().trim().min(2, "Enrollment number is required").max(40),
  cgpa: z.number().min(0).max(10).nullable(),
  tenth_percentage: z.number().min(0).max(100).nullable(),
  twelfth_percentage: z.number().min(0).max(100).nullable(),
  diploma_percentage: z.number().min(0).max(100).nullable(),
  active_backlogs: z.number().int().min(0).max(50),
  total_backlogs: z.number().int().min(0).max(50),
  graduation_year: z.number().int().min(2000).max(2100).nullable(),
});

type FormState = Record<string, string>;

function toForm(student: Student): FormState {
  const keys = [
    "full_name",
    "email",
    "phone",
    "enrollment_no",
    "date_of_birth",
    "gender",
    "course",
    "branch",
    "batch",
    "graduation_year",
    "cgpa",
    "tenth_percentage",
    "twelfth_percentage",
    "diploma_percentage",
    "active_backlogs",
    "total_backlogs",
    "linkedin_url",
    "github_url",
    "portfolio_url",
    "projects",
    "certifications",
  ] as const;
  const form: FormState = {};
  for (const key of keys) {
    const value = student[key];
    form[key] = value === null || value === undefined ? "" : String(value);
  }
  form["skills"] = (student.skills ?? []).join(", ");
  return form;
}

function num(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function StudentProfile() {
  const { student, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (student) setForm(toForm(student));
  }, [student]);

  const save = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error("No student profile");
      const payload = {
        full_name: form["full_name"] ?? "",
        email: form["email"] ?? "",
        phone: form["phone"] || null,
        enrollment_no: form["enrollment_no"] ?? "",
        date_of_birth: form["date_of_birth"] || null,
        gender: form["gender"] || null,
        course: form["course"] || null,
        branch: form["branch"] || null,
        batch: form["batch"] || null,
        graduation_year: num(form["graduation_year"] ?? ""),
        cgpa: num(form["cgpa"] ?? ""),
        tenth_percentage: num(form["tenth_percentage"] ?? ""),
        twelfth_percentage: num(form["twelfth_percentage"] ?? ""),
        diploma_percentage: num(form["diploma_percentage"] ?? ""),
        active_backlogs: num(form["active_backlogs"] ?? "") ?? 0,
        total_backlogs: num(form["total_backlogs"] ?? "") ?? 0,
        linkedin_url: form["linkedin_url"] || null,
        github_url: form["github_url"] || null,
        portfolio_url: form["portfolio_url"] || null,
        projects: form["projects"] || null,
        certifications: form["certifications"] || null,
        skills: (form["skills"] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

      const { error } = await supabase.from("students").update(payload).eq("id", student.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function uploadResume(file: File) {
    if (!student) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume must be under 5 MB");
      return;
    }
    setUploading(true);
    const path = `${student.user_id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { error: updateError } = await supabase
      .from("students")
      .update({ resume_url: path })
      .eq("id", student.id);
    setUploading(false);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Resume uploaded");
    refresh();
  }

  async function openResume() {
    if (!student?.resume_url) return;
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(student.resume_url, 60);
    if (error || !data) {
      toast.error("Could not open resume");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (!student) {
    return (
      <EmptyState
        title="No student profile linked"
        description="Your account is not linked to a student record. Contact your placement cell."
      />
    );
  }

  const completion = profileCompletion(student);

  function set(key: string) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  return (
    <>
      <PageHeader
        title="My profile"
        description="Keep your academic details current — eligibility checks use them."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save changes
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <p className="text-sm font-medium">Profile completion — {completion}%</p>
            <Progress value={completion} className="mt-3" />
          </div>
          <div className="flex items-center gap-2">
            {student.resume_url ? (
              <Button variant="outline" size="sm" onClick={openResume}>
                View resume
              </Button>
            ) : (
              <Badge variant="outline" className="bg-warning/10">
                No resume uploaded
              </Badge>
            )}
            <Label
              htmlFor="resume-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload resume
            </Label>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadResume(file);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={form["full_name"]} onChange={set("full_name")} />
            <TextField label="Email" value={form["email"]} onChange={set("email")} />
            <TextField label="Phone" value={form["phone"]} onChange={set("phone")} />
            <TextField
              label="Date of birth"
              type="date"
              value={form["date_of_birth"]}
              onChange={set("date_of_birth")}
            />
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form["gender"] ?? ""}
                onValueChange={(gender) => setForm((p) => ({ ...p, gender }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Enrollment number"
              value={form["enrollment_no"]}
              onChange={set("enrollment_no")}
            />
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={form["course"] ?? ""}
                onValueChange={(course) => setForm((p) => ({ ...p, course }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {COURSES.map((course) => (
                    <SelectItem key={course} value={course}>
                      {course}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form["branch"] ?? ""}
                onValueChange={(branch) => setForm((p) => ({ ...p, branch }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TextField
              label="Graduation year"
              value={form["graduation_year"]}
              onChange={set("graduation_year")}
            />
            <TextField label="CGPA" value={form["cgpa"]} onChange={set("cgpa")} />
            <TextField
              label="10th %"
              value={form["tenth_percentage"]}
              onChange={set("tenth_percentage")}
            />
            <TextField
              label="12th %"
              value={form["twelfth_percentage"]}
              onChange={set("twelfth_percentage")}
            />
            <TextField
              label="Diploma %"
              value={form["diploma_percentage"]}
              onChange={set("diploma_percentage")}
            />
            <TextField
              label="Active backlogs"
              value={form["active_backlogs"]}
              onChange={set("active_backlogs")}
            />
            <TextField
              label="Total backlogs"
              value={form["total_backlogs"]}
              onChange={set("total_backlogs")}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillsEditor skills={skills} onChange={setSkills} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Professional links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <LinkField
              label="LinkedIn"
              placeholder="https://linkedin.com/in/you"
              value={form["linkedin_url"] ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, linkedin_url: v }))}
            />
            <LinkField
              label="GitHub"
              placeholder="https://github.com/you"
              value={form["github_url"] ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, github_url: v }))}
            />
            <LinkField
              label="Portfolio"
              placeholder="https://yoursite.com"
              value={form["portfolio_url"] ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, portfolio_url: v }))}
            />
          </CardContent>
        </Card>

        <ProjectsSection studentId={student.id} />
        <CertificationsSection studentId={student.id} />
      </div>


      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={onChange} />
    </div>
  );
}
