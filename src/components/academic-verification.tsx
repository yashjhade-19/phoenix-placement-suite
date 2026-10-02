import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/common";
import { formatDateTime } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";

export const ACADEMIC_KEYS = [
  "enrollment_no",
  "course",
  "branch",
  "graduation_year",
  "cgpa",
  "tenth_percentage",
  "twelfth_percentage",
  "diploma_percentage",
  "active_backlogs",
  "total_backlogs",
] as const;

export const ACADEMIC_STATUSES = [
  { value: "pending_verification", label: "Pending Verification", tone: "bg-warning/15 text-foreground border-warning/50", dot: "bg-warning" },
  { value: "verified", label: "Verified", tone: "bg-success/10 text-success border-success/40", dot: "bg-success" },
  { value: "needs_correction", label: "Needs Correction", tone: "bg-destructive/10 text-destructive border-destructive/40", dot: "bg-destructive" },
] as const;

export function AcademicStatusBadge({ status }: { status: string | null | undefined }) {
  const meta =
    ACADEMIC_STATUSES.find((s) => s.value === status) ?? ACADEMIC_STATUSES[0];
  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap", meta.tone)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

const LABELS: Record<(typeof ACADEMIC_KEYS)[number], string> = {
  enrollment_no: "Enrollment number",
  course: "Course",
  branch: "Branch",
  graduation_year: "Graduation year",
  cgpa: "CGPA",
  tenth_percentage: "10th %",
  twelfth_percentage: "12th %",
  diploma_percentage: "Diploma %",
  active_backlogs: "Active backlogs",
  total_backlogs: "Total backlogs",
};

const NUMERIC = new Set([
  "graduation_year",
  "cgpa",
  "tenth_percentage",
  "twelfth_percentage",
  "diploma_percentage",
  "active_backlogs",
  "total_backlogs",
]);

export function StudentAcademicDialog({
  student,
  onOpenChange,
}: {
  student: Student | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit" | "correction">("view");
  const [form, setForm] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!student) return;
    setMode("view");
    setNote(student.academic_verification_notes ?? "");
    const next: Record<string, string> = {};
    for (const key of ACADEMIC_KEYS) next[key] = student[key] == null ? "" : String(student[key]);
    setForm(next);
  }, [student]);

  const mutation = useMutation({
    mutationFn: async (kind: "verify" | "correction" | "edit") => {
      if (!student) return;
      let update: Record<string, unknown> = {};
      if (kind === "verify") {
        const { data } = await supabase.auth.getUser();
        update = {
          academic_verification_status: "verified",
          academic_verified_at: new Date().toISOString(),
          academic_verified_by: data.user?.id ?? null,
          academic_verification_notes: null,
        };
      } else if (kind === "correction") {
        if (!note.trim()) throw new Error("Add a note explaining what needs correcting");
        update = {
          academic_verification_status: "needs_correction",
          academic_verified_at: null,
          academic_verified_by: null,
          academic_verification_notes: note.trim().slice(0, 500),
        };
      } else {
        for (const key of ACADEMIC_KEYS) {
          const raw = (form[key] ?? "").trim();
          if (NUMERIC.has(key)) {
            if (raw === "") {
              update[key] = key.endsWith("backlogs") ? 0 : null;
              continue;
            }
            const n = Number(raw);
            if (Number.isNaN(n) || n < 0) throw new Error(`${LABELS[key]} must be a valid number`);
            if (key === "cgpa" && n > 10) throw new Error("CGPA must be between 0 and 10");
            if (key.endsWith("percentage") && n > 100) throw new Error(`${LABELS[key]} must be 0–100`);
            update[key] = n;
          } else {
            if (key === "enrollment_no" && !raw) throw new Error("Enrollment number is required");
            update[key] = raw || null;
          }
        }
      }
      const { error } = await supabase.from("students").update(update).eq("id", student.id);
      if (error) throw new Error(error.message);
      return kind;
    },
    onSuccess: (kind) => {
      toast.success(
        kind === "verify"
          ? "Academic details verified"
          : kind === "correction"
            ? "Correction requested"
            : student?.academic_verification_status === "verified"
              ? "Academic details updated — marked for re-verification"
              : "Academic details updated",
      );
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!student) return null;
  const busy = mutation.isPending;

  return (
    <Dialog open={!!student} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {student.full_name}
            <AcademicStatusBadge status={student.academic_verification_status} />
          </DialogTitle>
          <DialogDescription>{student.email}</DialogDescription>
        </DialogHeader>

        {student.academic_verification_status === "verified" && mode === "view" ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> Academic Details Verified
            {student.academic_verified_at ? ` · ${formatDateTime(student.academic_verified_at)}` : ""}
          </p>
        ) : null}
        {student.academic_verification_status === "needs_correction" &&
        student.academic_verification_notes &&
        mode === "view" ? (
          <p className="text-sm text-muted-foreground">
            Correction note: {student.academic_verification_notes}
          </p>
        ) : null}

        {mode === "edit" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {ACADEMIC_KEYS.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`ac-${key}`}>{LABELS[key]}</Label>
                <Input
                  id={`ac-${key}`}
                  value={form[key] ?? ""}
                  inputMode={NUMERIC.has(key) ? "decimal" : undefined}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            {student.academic_verification_status === "verified" ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Saving changes will mark this record as needing re-verification.
              </p>
            ) : null}
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3">
            {ACADEMIC_KEYS.map((key) => (
              <Field key={key} label={LABELS[key]} value={student[key] == null ? "—" : String(student[key])} />
            ))}
          </dl>
        )}

        {mode === "correction" ? (
          <div className="space-y-1.5">
            <Label htmlFor="ac-note">What needs correcting?</Label>
            <Textarea
              id="ac-note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 12th percentage does not match marksheet"
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {mode === "view" ? (
            <>
              <Button variant="outline" onClick={() => setMode("edit")}>
                Edit Academic Details
              </Button>
              {student.academic_verification_status !== "needs_correction" ? (
                <Button variant="outline" onClick={() => setMode("correction")}>
                  Request Correction
                </Button>
              ) : null}
              {student.academic_verification_status !== "verified" ? (
                <Button onClick={() => mutation.mutate("verify")} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Verify Academic Details
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setMode("view")} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => mutation.mutate(mode === "edit" ? "edit" : "correction")} disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {mode === "edit" ? "Save changes" : "Send correction request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
