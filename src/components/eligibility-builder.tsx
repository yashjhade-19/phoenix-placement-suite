import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listStudents } from "@/lib/api";
import { BRANCHES, COURSES } from "@/lib/domain";
import {
  RULE_CATEGORIES,
  RULE_FIELDS,
  describeRule,
  driveEligibility,
} from "@/lib/eligibility";
import type { EligibilityRule } from "@/lib/types";
import { EmptyState, StatCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Draft = { id?: string | undefined; field: string; operator: string; value: string };

function operatorsFor(field: string): { value: string; label: string }[] {
  const kind = RULE_FIELDS[field]?.kind;
  if (field === "active_backlogs" || field === "total_backlogs")
    return [
      { value: "lte", label: "at most" },
      { value: "eq", label: "exactly" },
    ];
  if (field === "graduation_year")
    return [
      { value: "in", label: "is one of" },
      { value: "eq", label: "equals" },
    ];
  if (kind === "number")
    return [
      { value: "gte", label: "at least" },
      { value: "lte", label: "at most" },
    ];
  if (kind === "text")
    return [
      { value: "in", label: "is one of" },
      { value: "neq", label: "is not" },
    ];
  if (kind === "skills") return [{ value: "has", label: "includes" }];
  return [{ value: "present", label: "is provided" }];
}

function defaultDraft(field: string): Draft {
  const op = operatorsFor(field)[0]!.value;
  return { field, operator: op, value: field.includes("backlogs") ? "0" : "" };
}

export function EligibilityBuilder({
  driveId,
  rules,
  batches,
}: {
  driveId: string;
  rules: EligibilityRule[];
  batches: number[];
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showFilter, setShowFilter] = useState<"all" | "eligible" | "ineligible">("ineligible");

  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const sorted = rules.slice().sort((a, b) => a.group_index - b.group_index);

  const evaluation = useMemo(
    () =>
      (studentsQuery.data ?? []).map((student) => ({
        student,
        ...driveEligibility(student, rules, batches),
      })),
    [studentsQuery.data, rules, batches],
  );
  const eligibleCount = evaluation.filter((e) => e.eligible).length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-drive", driveId] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-rules"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const meta = RULE_FIELDS[d.field];
      if (!meta) throw new Error("Choose a criterion");
      if (d.operator !== "present" && !d.value.trim()) throw new Error("Enter a value");
      if (meta.kind === "number" && d.operator !== "in" && Number.isNaN(Number(d.value)))
        throw new Error("Value must be a number");
      if (d.id) {
        const { error } = await supabase
          .from("eligibility_rules")
          .update({ field: d.field, operator: d.operator, value: d.value.trim() || "yes" })
          .eq("id", d.id);
        if (error) throw new Error(error.message);
      } else {
        const next = Math.max(-1, ...rules.map((r) => r.group_index)) + 1;
        const { error } = await supabase.from("eligibility_rules").insert({
          drive_id: driveId,
          field: d.field,
          operator: d.operator,
          value: d.value.trim() || "yes",
          group_index: next,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Eligibility rule saved");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eligibility_rules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Rule removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = evaluation.filter((e) =>
    showFilter === "all" ? true : showFilter === "eligible" ? e.eligible : !e.eligible,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Eligibility criteria</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {rules.length} eligibility rule{rules.length === 1 ? "" : "s"} configured · all
              criteria must be met
              {batches.length ? ` · batch ${batches.join(", ")}` : ""}
            </p>
          </div>
          {rules.length > 0 ? (
            <Button size="sm" onClick={() => setDraft(defaultDraft("cgpa"))}>
              <Plus className="mr-1 size-4" /> Add rule
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              title="No eligibility rules configured"
              description="All students in the eligible batches can apply."
              action={
                <Button onClick={() => setDraft(defaultDraft("cgpa"))}>
                  <Plus className="mr-1 size-4" /> Add eligibility rule
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {RULE_CATEGORIES.map((category) => {
                const list = sorted.filter(
                  (r) => (RULE_FIELDS[r.field]?.category ?? "Profile & skills") === category,
                );
                if (list.length === 0) return null;
                return (
                  <div key={category} className="rounded-md border p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {category}
                    </p>
                    <ul className="space-y-1">
                      {list.map((rule) => (
                        <li
                          key={rule.id}
                          className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                        >
                          <span>{describeRule(rule)}</span>
                          <span className="flex shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-label="Edit rule"
                              onClick={() =>
                                setDraft({
                                  id: rule.id,
                                  field: rule.field,
                                  operator: rule.operator,
                                  value: rule.value,
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              aria-label="Remove rule"
                              onClick={() => remove.mutate(rule.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students evaluated" value={evaluation.length} />
        <StatCard label="Eligible students" value={eligibleCount} />
        <StatCard label="Ineligible students" value={evaluation.length - eligibleCount} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Student eligibility</CardTitle>
          <Select value={showFilter} onValueChange={(v) => setShowFilter(v as typeof showFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="eligible">Eligible</SelectItem>
              <SelectItem value="ineligible">Not eligible</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>CGPA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.slice(0, 100).map(({ student, eligible, reasons }) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="font-medium">{student.full_name}</div>
                  <div className="text-xs text-muted-foreground">{student.enrollment_no}</div>
                </TableCell>
                <TableCell>{student.branch ?? "—"}</TableCell>
                <TableCell>
                  {student.cgpa ?? "—"}
                  <div className="text-[11px] text-muted-foreground">
                    {student.academic_verification_status === "verified" ? "Verified" : "Pending verification"}
                  </div>
                </TableCell>
                <TableCell>
                  {eligible ? (
                    <span className="inline-flex items-center gap-1 text-sm text-success">
                      <CheckCircle2 className="size-4" /> Eligible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-destructive">
                      <XCircle className="size-4" /> Not eligible
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-sm text-xs text-muted-foreground">
                  {reasons.join("; ") || "—"}
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No students in this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        {shown.length > 100 ? (
          <p className="border-t p-3 text-xs text-muted-foreground">
            Showing first 100 of {shown.length} students.
          </p>
        ) : null}
      </Card>

      <RuleDialog
        draft={draft}
        onChange={setDraft}
        onSave={() => draft && save.mutate(draft)}
        saving={save.isPending}
      />
    </div>
  );
}

function RuleDialog({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: Draft | null;
  onChange: (d: Draft | null) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!draft) return null;
  const meta = RULE_FIELDS[draft.field];
  const ops = operatorsFor(draft.field);
  const multi =
    draft.operator === "in" && (draft.field === "branch" || draft.field === "course");
  const options = draft.field === "branch" ? BRANCHES : COURSES;
  const selected = draft.value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return (
    <Dialog open onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit eligibility rule" : "Add eligibility rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Criterion</Label>
            <Select value={draft.field} onValueChange={(f) => onChange({ ...defaultDraft(f), id: draft.id })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_CATEGORIES.map((cat) =>
                  Object.entries(RULE_FIELDS)
                    .filter(([, m]) => m.category === cat)
                    .map(([key, m]) => (
                      <SelectItem key={key} value={key}>
                        {cat} · {m.label}
                      </SelectItem>
                    )),
                )}
              </SelectContent>
            </Select>
          </div>
          {ops.length > 1 ? (
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={draft.operator}
                onValueChange={(operator) => onChange({ ...draft, operator, value: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {meta?.label} {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {draft.operator === "present" ? (
            <p className="text-sm text-muted-foreground">
              Students must have their {meta?.label.toLowerCase()} on their profile.
            </p>
          ) : multi ? (
            <div className="space-y-2">
              <Label>Allowed values (any one)</Label>
              <div className="grid grid-cols-3 gap-2">
                {options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(opt)}
                      onCheckedChange={(c) => {
                        const next = c ? [...selected, opt] : selected.filter((s) => s !== opt);
                        onChange({ ...draft, value: next.join(",") });
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={draft.value}
                inputMode={meta?.kind === "number" ? "decimal" : "text"}
                placeholder={
                  draft.operator === "in" ? "e.g. 2026, 2027" : meta?.kind === "skills" ? "e.g. Python" : "e.g. 7.5"
                }
                onChange={(e) => onChange({ ...draft, value: e.target.value })}
              />
            </div>
          )}
          {draft.operator !== "present" && draft.value ? (
            <Badge variant="secondary">
              {describeRule({ field: draft.field, operator: draft.operator, value: draft.value } as EligibilityRule)}
            </Badge>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
