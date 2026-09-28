import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { APPLICATION_STATUS_LABELS, BRANCHES, formatDate } from "@/lib/domain";
import { driveEligibility } from "@/lib/eligibility";
import type { EligibilityRule, Student } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/applications/")({
  head: () => ({
    meta: [
      { title: "Applications · HirePhoenix" },
      { name: "description", content: "Filter, shortlist and export placement applicants." },
    ],
  }),
  component: AdminApplications,
});

const APP_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "selected",
  "rejected",
  "withdrawn",
] as const;
type AppStatus = (typeof APP_STATUSES)[number];

const initialFilters = {
  drive: "all",
  company: "all",
  status: "all",
  branches: [] as string[],
  year: "all",
  minCgpa: "",
  maxBacklogs: "",
  eligibility: "all",
  skill: "",
  response: "",
};

function AdminApplications() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [f, setF] = useState(initialFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmReject, setConfirmReject] = useState(false);
  const term = useDebounce(search);
  const skillTerm = useDebounce(f.skill);
  const responseTerm = useDebounce(f.response);

  const query = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, student:students(*), drive:drives(id, title, eligible_batches, company:companies(id, name))",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ["admin-all-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eligibility_rules").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as EligibilityRule[];
    },
  });

  const responsesQuery = useQuery({
    queryKey: ["admin-all-responses"],
    enabled: responseTerm.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_responses")
        .select("application_id, value");
      if (error) throw new Error(error.message);
      const map = new Map<string, string>();
      for (const r of data ?? [])
        map.set(r.application_id, `${map.get(r.application_id) ?? ""} ${JSON.stringify(r.value ?? "")}`.toLowerCase());
      return map;
    },
  });

  const enriched = useMemo(() => {
    const rules = rulesQuery.data ?? [];
    return (query.data ?? []).map((row) => {
      const driveRules = rules.filter((r) => r.drive_id === row.drive_id);
      const ev = driveEligibility(row.student as Student, driveRules, row.drive?.eligible_batches ?? []);
      return { ...row, eligible: ev.eligible, reasons: ev.reasons };
    });
  }, [query.data, rulesQuery.data]);

  const drives = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((r) => r.drive && m.set(r.drive.id, r.drive.title));
    return [...m.entries()];
  }, [enriched]);
  const companies = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((r) => r.drive?.company && m.set(r.drive.company.id, r.drive.company.name));
    return [...m.entries()];
  }, [enriched]);
  const years = useMemo(
    () => [...new Set(enriched.map((r) => r.student?.graduation_year).filter(Boolean))].sort() as number[],
    [enriched],
  );

  const rows = enriched.filter((row) => {
    const s = row.student;
    const q = term.trim().toLowerCase();
    if (q && !`${s?.full_name ?? ""} ${s?.enrollment_no ?? ""} ${row.drive?.title ?? ""}`.toLowerCase().includes(q))
      return false;
    if (f.drive !== "all" && row.drive_id !== f.drive) return false;
    if (f.company !== "all" && row.drive?.company?.id !== f.company) return false;
    if (f.status !== "all" && row.status !== f.status) return false;
    if (f.branches.length && !f.branches.includes(s?.branch ?? "")) return false;
    if (f.year !== "all" && String(s?.graduation_year) !== f.year) return false;
    if (f.minCgpa && (s?.cgpa ?? -1) < Number(f.minCgpa)) return false;
    if (f.maxBacklogs !== "" && (s?.active_backlogs ?? 0) > Number(f.maxBacklogs)) return false;
    if (f.eligibility === "eligible" && !row.eligible) return false;
    if (f.eligibility === "ineligible" && row.eligible) return false;
    const sk = skillTerm.trim().toLowerCase();
    if (sk && !(s?.skills ?? []).some((x) => x.toLowerCase().includes(sk))) return false;
    const rt = responseTerm.trim().toLowerCase();
    if (rt && responsesQuery.data && !(responsesQuery.data.get(row.id) ?? "").includes(rt)) return false;
    return true;
  });

  const activeFilterCount =
    Object.entries(f).filter(([k, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== (initialFilters as Record<string, unknown>)[k],
    ).length + (search ? 1 : 0);

  const bulk = useMutation({
    mutationFn: async ({ ids, next }: { ids: string[]; next: AppStatus }) => {
      const { error } = await supabase.from("applications").update({ status: next }).in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      toast.success(`${v.ids.length} application${v.ids.length > 1 ? "s" : ""} marked ${APPLICATION_STATUS_LABELS[v.next].toLowerCase()}`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-drive-apps"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingBlock rows={6} />;

  const visible = rows.slice(0, 200);
  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const selectedIds = [...selected];

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const exportCsv = () => {
    const picked = enriched.filter((r) => selected.has(r.id));
    const header = ["Name", "Enrollment", "Email", "Branch", "Graduation year", "CGPA", "Active backlogs", "Drive", "Company", "Status", "Eligible", "Applied on"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = picked.map((r) =>
      [r.student?.full_name, r.student?.enrollment_no, r.student?.email, r.student?.branch, r.student?.graduation_year, r.student?.cgpa, r.student?.active_backlogs, r.drive?.title, r.drive?.company?.name, APPLICATION_STATUS_LABELS[r.status], r.eligible ? "Yes" : "No", formatDate(r.created_at)]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applicants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Applications" description="Filter, review and progress candidates across every drive." />

      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or drive" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Drive" value={f.drive} onChange={(v) => setF({ ...f, drive: v })} options={drives} />
            <FilterSelect label="Company" value={f.company} onChange={(v) => setF({ ...f, company: v })} options={companies} />
            <FilterSelect label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={APP_STATUSES.map((s) => [s, APPLICATION_STATUS_LABELS[s]])} />
            <FilterSelect label="Eligibility" value={f.eligibility} onChange={(v) => setF({ ...f, eligibility: v })} options={[["eligible", "Eligible"], ["ineligible", "Not eligible"]]} />
            <FilterSelect label="Graduation year" value={f.year} onChange={(v) => setF({ ...f, year: v })} options={years.map((y) => [String(y), String(y)])} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Minimum CGPA</Label>
              <Input inputMode="decimal" placeholder="e.g. 8" value={f.minCgpa} onChange={(e) => setF({ ...f, minCgpa: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max active backlogs</Label>
              <Input inputMode="numeric" placeholder="e.g. 0" value={f.maxBacklogs} onChange={(e) => setF({ ...f, maxBacklogs: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Skill</Label>
              <Input placeholder="e.g. React" value={f.skill} onChange={(e) => setF({ ...f, skill: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Branch (any of)</Label>
              <div className="flex flex-wrap gap-1.5">
                {BRANCHES.map((b) => {
                  const on = f.branches.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setF({ ...f, branches: on ? f.branches.filter((x) => x !== b) : [...f.branches, b] })}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 lg:w-72">
              <Label className="text-xs text-muted-foreground">Application form answers contain</Label>
              <Input placeholder="e.g. Bangalore" value={f.response} onChange={(e) => setF({ ...f, response: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{rows.length}</span> applicant{rows.length === 1 ? "" : "s"} match your filters
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => { setF(initialFilters); setSearch(""); }}>
                <X className="mr-1 size-4" /> Clear filters
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-accent/50 p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate({ ids: selectedIds, next: "shortlisted" })}>
              Shortlist selected
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" disabled={bulk.isPending} onClick={() => setConfirmReject(true)}>
              Reject selected
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-1 size-4" /> Export selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No applicants match your filters" description="Try removing a filter to widen the results." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onCheckedChange={(c) => {
                      const next = new Set(selected);
                      visible.forEach((r) => (c ? next.add(r.id) : next.delete(r.id)));
                      setSelected(next);
                    }}
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-44">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox aria-label="Select applicant" checked={selected.has(row.id)} onCheckedChange={(c) => toggle(row.id, !!c)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.student?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.student?.enrollment_no} • {row.student?.branch ?? "—"} • {row.student?.graduation_year ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.drive?.title}</div>
                    <div className="text-xs text-muted-foreground">{row.drive?.company?.name}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.student?.cgpa ?? "—"}
                    <div className="text-xs text-muted-foreground">{row.student?.active_backlogs ?? 0} backlogs</div>
                  </TableCell>
                  <TableCell>
                    {row.eligible ? (
                      <Badge variant="outline" className="border-success/25 bg-success/10 text-success">Eligible</Badge>
                    ) : (
                      <Badge variant="outline" title={row.reasons.join("\n")} className="border-destructive/20 bg-destructive/10 text-destructive">
                        Not eligible
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>
                    <Select value={row.status} onValueChange={(next) => bulk.mutate({ ids: [row.id], next: next as AppStatus })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {APPLICATION_STATUS_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin/applications/$applicationId" params={{ applicationId: row.id }}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > 200 ? (
            <p className="border-t p-3 text-xs text-muted-foreground">Showing first 200 of {rows.length}. Narrow your filters to see more.</p>
          ) : null}
        </Card>
      )}

      <AlertDialog open={confirmReject} onOpenChange={setConfirmReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {selected.size} applicant{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their applications will be marked as rejected and students will see the updated status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulk.mutate({ ids: selectedIds, next: "rejected" })}>
              Reject applicants
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][] | string[][];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v!}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
