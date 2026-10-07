import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  GraduationCap,
  IndianRupee,
  ListChecks,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { listOffers } from "@/lib/offers";
import { listApplications, listDrives, listStudents } from "@/lib/api";
import { EmptyState, ErrorBlock } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCurrency } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/reports")({
  head: () => ({
    meta: [
      { title: "Placement Analytics — HirePhoenix" },
      { name: "description", content: "Placement funnel, branch, batch and drive analytics for the placement cell." },
      { property: "og:title", content: "Placement Analytics — HirePhoenix" },
      { property: "og:description", content: "Placement funnel, branch, batch and drive analytics for the placement cell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReports,
});

const ALL = "all";
const num = (n: number) => n.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const pctLabel = (a: number, b: number) => (b ? `${pct(a, b)}%` : "—");

type Filters = { batch: string; branch: string; company: string; drive: string; from: string; to: string };
const EMPTY: Filters = { batch: ALL, branch: ALL, company: ALL, drive: ALL, from: "", to: "" };

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

function AdminReports() {
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications() });
  const offersQuery = useQuery({ queryKey: ["offers"], queryFn: () => listOffers() });
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (k: keyof Filters, v: string) =>
    setF((p) => ({ ...p, [k]: v, ...(k === "company" ? { drive: ALL } : {}) }));

  const students = studentsQuery.data ?? [];
  const drives = drivesQuery.data ?? [];
  const apps = appsQuery.data ?? [];
  const offers = offersQuery.data ?? [];

  const options = useMemo(() => {
    const batches = [...new Set(students.map((s) => s.graduation_year).filter((y): y is number => !!y))].sort();
    const branches = [...new Set(students.map((s) => s.branch).filter((b): b is string => !!b))].sort();
    const companies = new Map<string, string>();
    drives.forEach((d) => d.company && companies.set(d.company.id, d.company.name));
    return {
      batches,
      branches,
      companies: [...companies.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [students, drives]);

  const driveOptions = drives.filter((d) => f.company === ALL || d.company_id === f.company);

  const data = useMemo(() => {
    const inRange = (iso: string | null | undefined) => {
      if (!iso) return !f.from && !f.to;
      const d = iso.slice(0, 10);
      return (!f.from || d >= f.from) && (!f.to || d <= f.to);
    };
    const pool = students.filter(
      (s) =>
        (f.batch === ALL || String(s.graduation_year) === f.batch) &&
        (f.branch === ALL || s.branch === f.branch),
    );
    const poolIds = new Set(pool.map((s) => s.id));
    const driveMatch = (driveId: string, companyId?: string | null) =>
      (f.drive === ALL || driveId === f.drive) && (f.company === ALL || companyId === f.company);
    const driveCompany = new Map(drives.map((d) => [d.id, d.company_id]));
    const fApps = apps.filter(
      (a) => poolIds.has(a.student_id) && driveMatch(a.drive_id, driveCompany.get(a.drive_id)) && inRange(a.created_at),
    );
    const placedOffers = offers.filter(
      (o) =>
        o.status === "placed" &&
        poolIds.has(o.student_id) &&
        driveMatch(o.drive_id, o.company_id) &&
        inRange(o.release_date ?? o.created_at),
    );
    const isShortlisted = (a: (typeof apps)[number]) =>
      a.status === "shortlisted" || a.status === "selected" || !!a.current_stage_id;
    const shortlisted = fApps.filter(isShortlisted);
    const selected = fApps.filter((a) => a.status === "selected");
    const placedIds = new Set(placedOffers.map((o) => o.student_id));

    const group = <K extends string | number>(keys: K[], keyOf: (s: (typeof students)[number]) => K | null) =>
      keys.map((key) => {
        const ids = new Set(pool.filter((s) => keyOf(s) === key).map((s) => s.id));
        const ga = fApps.filter((a) => ids.has(a.student_id));
        const placed = [...placedIds].filter((id) => ids.has(id)).length;
        return {
          key: String(key),
          total: ids.size,
          applications: ga.length,
          shortlisted: ga.filter(isShortlisted).length,
          selected: ga.filter((a) => a.status === "selected").length,
          placed,
          rate: pct(placed, ids.size),
        };
      }).filter((r) => r.total > 0);

    const branchRows = group(options.branches, (s) => s.branch);
    const batchRows = group(options.batches, (s) => s.graduation_year);

    const driveRows = drives
      .filter((d) => driveMatch(d.id, d.company_id))
      .map((d) => {
        const da = fApps.filter((a) => a.drive_id === d.id);
        const sel = da.filter((a) => a.status === "selected").length;
        const placed = placedOffers.filter((o) => o.drive_id === d.id).length;
        return {
          id: d.id,
          title: d.title,
          company: d.company?.name ?? "—",
          ctc: d.ctc,
          applications: da.length,
          shortlisted: da.filter(isShortlisted).length,
          selected: sel,
          placed,
        };
      })
      .filter((r) => r.applications > 0 || r.placed > 0)
      .sort((a, b) => b.applications - a.applications);

    // trend by month
    const months = new Map<string, { month: string; applications: number; placements: number }>();
    const bump = (iso: string | null | undefined, key: "applications" | "placements") => {
      if (!iso) return;
      const m = iso.slice(0, 7);
      const row = months.get(m) ?? { month: m, applications: 0, placements: 0 };
      row[key]++;
      months.set(m, row);
    };
    fApps.forEach((a) => bump(a.created_at, "applications"));
    placedOffers.forEach((o) => bump(o.release_date ?? o.created_at, "placements"));
    const trend = [...months.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({
        ...r,
        label: new Date(`${r.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      }));

    // package overview — drive-level CTC for selected/placed candidates
    const ctcById = new Map(drives.map((d) => [d.id, d.ctc]));
    const pkgSelected = selected.map((a) => ctcById.get(a.drive_id)).filter((c): c is number => typeof c === "number" && c > 0);
    const pkgPlaced = placedOffers.map((o) => ctcById.get(o.drive_id)).filter((c): c is number => typeof c === "number" && c > 0);
    const pkg = pkgPlaced.length ? pkgPlaced : pkgSelected;

    return {
      pool,
      apps: fApps,
      shortlisted: shortlisted.length,
      selected: selected.length,
      placed: placedIds.size,
      branchRows,
      batchRows,
      driveRows,
      trend,
      pkg: {
        basis: pkgPlaced.length ? "placed" : "selected",
        count: pkg.length,
        avg: pkg.length ? pkg.reduce((s, c) => s + c, 0) / pkg.length : null,
        max: pkg.length ? Math.max(...pkg) : null,
      },
    };
  }, [students, drives, apps, offers, f, options]);

  const loading = studentsQuery.isLoading || drivesQuery.isLoading || appsQuery.isLoading || offersQuery.isLoading;
  const error = studentsQuery.error || drivesQuery.error || appsQuery.error || offersQuery.error;

  const activeChips: [keyof Filters, string][] = [];
  if (f.batch !== ALL) activeChips.push(["batch", `Batch ${f.batch}`]);
  if (f.branch !== ALL) activeChips.push(["branch", f.branch]);
  if (f.company !== ALL) activeChips.push(["company", options.companies.find(([id]) => id === f.company)?.[1] ?? "Company"]);
  if (f.drive !== ALL) activeChips.push(["drive", drives.find((d) => d.id === f.drive)?.title ?? "Drive"]);
  if (f.from) activeChips.push(["from", `From ${f.from}`]);
  if (f.to) activeChips.push(["to", `To ${f.to}`]);

  function exportReport() {
    const d = data;
    if (!d.pool.length) return toast.error("No data matches your filters to export");
    const rows: unknown[][] = [];
    const filterText = activeChips.length ? activeChips.map((c) => c[1]).join("; ") : "None";
    rows.push(["Filters", filterText], []);
    rows.push(["Summary"], ["Total students", d.pool.length], ["Total applications", d.apps.length],
      ["Shortlisted", d.shortlisted], ["Selected", d.selected], ["Placed", d.placed],
      ["Placement rate (%)", pct(d.placed, d.pool.length)],
      ["Average package", d.pkg.avg ?? ""], ["Highest package", d.pkg.max ?? ""], []);
    rows.push(["Branch", "Students", "Applications", "Shortlisted", "Selected", "Placed", "Placement rate (%)"]);
    d.branchRows.forEach((r) => rows.push([r.key, r.total, r.applications, r.shortlisted, r.selected, r.placed, r.rate]));
    rows.push([], ["Batch", "Students", "Applications", "Shortlisted", "Selected", "Placed", "Placement rate (%)"]);
    d.batchRows.forEach((r) => rows.push([r.key, r.total, r.applications, r.shortlisted, r.selected, r.placed, r.rate]));
    rows.push([], ["Drive", "Company", "Applications", "Shortlisted", "Selected", "Placed", "Selection rate (%)", "Package (drive CTC)"]);
    d.driveRows.forEach((r) => rows.push([r.title, r.company, r.applications, r.shortlisted, r.selected, r.placed, pct(r.selected, r.applications), r.ctc ?? ""]));
    downloadCsv("HirePhoenix_Placement_Report.csv", ["HirePhoenix Placement Report", new Date().toLocaleString("en-IN")], rows);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <BarChart3 className="size-4" /> Reports
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Placement Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live placement funnel, branch and batch performance, and drive outcomes — calculated from your current records.
          </p>
        </div>
        <Button onClick={exportReport} disabled={loading}>
          <Download className="size-4" /> Export report
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <FilterSelect label="Batch" value={f.batch} onChange={(v) => set("batch", v)}
              items={options.batches.map((b) => [String(b), String(b)])} />
            <FilterSelect label="Branch" value={f.branch} onChange={(v) => set("branch", v)}
              items={options.branches.map((b) => [b, b])} />
            <FilterSelect label="Company" value={f.company} onChange={(v) => set("company", v)}
              items={options.companies} />
            <FilterSelect label="Drive" value={f.drive} onChange={(v) => set("drive", v)}
              items={driveOptions.map((d) => [d.id, d.title])} />
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Filter className="size-3.5 text-muted-foreground" />
            {activeChips.length ? (
              <>
                <span className="text-muted-foreground">Filtered by</span>
                {activeChips.map(([k, label]) => (
                  <Badge key={k} variant="secondary" className="gap-1 font-normal">
                    {label}
                    <button aria-label={`Remove ${label}`} onClick={() => set(k, k === "from" || k === "to" ? "" : ALL)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setF(EMPTY)}>
                  Clear filters
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground">Showing all students, drives and dates. Date range applies to applications and placement dates.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <ErrorBlock message="We couldn't load report data. Please refresh to try again." />
      ) : loading ? (
        <ReportSkeleton />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total students" value={num(data.pool.length)} hint="In selected batch/branch" icon={<Users className="size-4" />} />
            <Kpi label="Applications" value={num(data.apps.length)} hint={`${pctLabel(new Set(data.apps.map((a) => a.student_id)).size, data.pool.length)} of students applied`} icon={<FileText className="size-4" />} />
            <Kpi label="Shortlisted" value={num(data.shortlisted)} hint="Shortlisted or in rounds" icon={<ListChecks className="size-4" />} />
            <Kpi label="Selected" value={num(data.selected)} hint="Application status: Selected" icon={<CheckCircle2 className="size-4" />} />
            <Kpi label="Placed" value={num(data.placed)} hint="Placement outcome: Placed" icon={<Award className="size-4" />} />
            <Kpi label="Placement rate" value={pctLabel(data.placed, data.pool.length)} hint={`${num(data.placed)} of ${num(data.pool.length)} students`} icon={<TrendingUp className="size-4" />} highlight />
          </div>

          {/* Funnel */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Placement funnel</CardTitle>
              <CardDescription>Applications through to final placement. Percentages show conversion from the previous stage.</CardDescription>
            </CardHeader>
            <CardContent>
              <Funnel stages={[
                ["Applications", data.apps.length],
                ["Shortlisted", data.shortlisted],
                ["Selected", data.selected],
                ["Placed", data.placed],
              ]} />
            </CardContent>
          </Card>

          {/* Branch + Batch */}
          <div className="grid gap-6 xl:grid-cols-2">
            <GroupCard title="Branch-wise placement" description="Placement rate and pipeline per branch" firstCol="Branch" rows={data.branchRows} />
            <GroupCard title="Batch-wise placement" description="Performance by graduation year" firstCol="Batch" rows={data.batchRows} icon={<GraduationCap className="size-4" />} />
          </div>

          {/* Drives */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Drive & company performance</CardTitle>
              <CardDescription>Sorted by application volume</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.driveRows.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Drive</TableHead>
                        <TableHead className="text-right">Applications</TableHead>
                        <TableHead className="text-right">Shortlisted</TableHead>
                        <TableHead className="text-right">Selected</TableHead>
                        <TableHead className="text-right">Placed</TableHead>
                        <TableHead className="w-44 pr-6">Selection rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.driveRows.map((r) => {
                        const rate = pct(r.selected, r.applications);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="pl-6">
                              <p className="font-medium">{r.company}</p>
                              <p className="text-xs text-muted-foreground">{r.title}</p>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{num(r.applications)}</TableCell>
                            <TableCell className="text-right tabular-nums">{num(r.shortlisted)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{num(r.selected)}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-success">{num(r.placed)}</TableCell>
                            <TableCell className="pr-6">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(rate, 100)}%` }} />
                                </div>
                                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{pctLabel(r.selected, r.applications)}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-6"><EmptyState title="No drive activity for these filters" /></div>
              )}
            </CardContent>
          </Card>

          {/* Trend + Package */}
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="shadow-none xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Activity over time</CardTitle>
                <CardDescription>Applications submitted and placements recorded per month</CardDescription>
              </CardHeader>
              <CardContent>
                {data.trend.length >= 2 ? (
                  <div className="h-64" role="img" aria-label="Monthly applications and placements chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trend} margin={{ left: -16, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="applications" name="Applications" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} strokeWidth={2} />
                        <Area type="monotone" dataKey="placements" name="Placements" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={<TrendingUp className="size-6" />}
                    title="Not enough history yet"
                    description="A trend needs activity in at least two different months. It will appear as more applications and placements are recorded."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><IndianRupee className="size-4" /> Package overview</CardTitle>
                <CardDescription>Based on each drive's listed package</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-accent/60 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average package</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">{data.pkg.avg ? formatCurrency(data.pkg.avg) : "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Highest</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{data.pkg.max ? formatCurrency(data.pkg.max) : "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Candidates</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{num(data.pkg.count)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.pkg.count
                    ? `Calculated from ${data.pkg.basis} candidates whose drive lists a package.`
                    : "No selected or placed candidates with package data for these filters."}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {items.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Kpi({ label, value, hint, icon, highlight }: { label: string; value: string; hint: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={cn("shadow-none transition-colors hover:border-primary/30", highlight && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <span className={cn("rounded-md p-1.5", highlight ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>{icon}</span>
        </div>
        <p className={cn("mt-3 text-3xl font-semibold tabular-nums", highlight && "text-primary")}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Funnel({ stages }: { stages: [string, number][] }) {
  const max = Math.max(stages[0]?.[1] ?? 0, 1);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {stages.map(([name, count], i) => {
        const prev = i > 0 ? stages[i - 1]![1] : null;
        return (
          <div key={name} className="relative rounded-lg border p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">{name}</p>
              {prev !== null ? (
                <span className="text-xs text-muted-foreground" title={`Conversion from ${stages[i - 1]![0]}`}>
                  {pctLabel(count, prev)} of prev.
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{num(count)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", i === stages.length - 1 ? "bg-success" : "bg-primary")}
                style={{ width: `${(count / max) * 100}%`, opacity: 1 - i * 0.15 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

type GroupRow = { key: string; total: number; applications: number; shortlisted: number; selected: number; placed: number; rate: number };

function GroupCard({ title, description, firstCol, rows, icon }: { title: string; description: string; firstCol: string; rows: GroupRow[]; icon?: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length ? (
          <>
            <div className="w-full" style={{ height: Math.max(rows.length * 36 + 24, 120) }} role="img" aria-label={`${title} placement rate chart`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="key" width={64} tick={{ fontSize: 12, fill: "var(--foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    formatter={(v: number, _n, p) => [`${v}% (${p.payload.placed}/${p.payload.total})`, "Placement rate"]} />
                  <Bar dataKey="rate" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{firstCol}</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Apps</TableHead>
                    <TableHead className="text-right">Shortl.</TableHead>
                    <TableHead className="text-right">Selected</TableHead>
                    <TableHead className="text-right">Placed</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{r.key}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.applications)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.shortlisted)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.selected)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(r.placed)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{r.rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <EmptyState title="No students match these filters" />
        )}
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      <Skeleton className="h-72" />
    </div>
  );
}
