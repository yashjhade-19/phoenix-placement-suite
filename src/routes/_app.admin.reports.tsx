import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Briefcase, IndianRupee, Users } from "lucide-react";
import { listOffers } from "@/lib/offers";
import { listApplications, listDrives, listStudents } from "@/lib/api";
import { EmptyState, LoadingBlock, PageHeader, StatCard } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications() });
  const offersQuery = useQuery({ queryKey: ["offers"], queryFn: () => listOffers() });

  if (studentsQuery.isLoading || drivesQuery.isLoading || appsQuery.isLoading)
    return <LoadingBlock rows={6} />;

  const students = studentsQuery.data ?? [];
  const drives = drivesQuery.data ?? [];
  const applications = appsQuery.data ?? [];

  const selected = applications.filter((a) => a.status === "selected");
  const placedIds = new Set(
    (offersQuery.data ?? []).filter((o) => o.status === "placed").map((o) => o.student_id),
  );
  const placementRate = students.length
    ? Math.round((placedIds.size / students.length) * 100)
    : 0;

  const offerCtcs = selected
    .map((a) => drives.find((d) => d.id === a.drive_id)?.ctc)
    .filter((c): c is number => typeof c === "number" && c > 0);
  const avgCtc = offerCtcs.length
    ? offerCtcs.reduce((sum, c) => sum + c, 0) / offerCtcs.length
    : null;
  const highestCtc = offerCtcs.length ? Math.max(...offerCtcs) : null;

  const branches = Array.from(
    new Set(students.map((s) => s.branch).filter((b): b is string => !!b)),
  ).sort();

  const branchRows = branches.map((branch) => {
    const inBranch = students.filter((s) => s.branch === branch);
    const placedInBranch = inBranch.filter((s) => placedIds.has(s.id)).length;
    return {
      branch,
      total: inBranch.length,
      placed: placedInBranch,
      rate: inBranch.length ? Math.round((placedInBranch / inBranch.length) * 100) : 0,
    };
  });

  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const driveRows = drives
    .map((drive) => {
      const driveApps = applications.filter((a) => a.drive_id === drive.id);
      return {
        id: drive.id,
        title: drive.title,
        company: drive.company?.name ?? "—",
        applied: driveApps.length,
        selected: driveApps.filter((a) => a.status === "selected").length,
      };
    })
    .sort((a, b) => b.applied - a.applied);

  return (
    <>
      <PageHeader
        title="Placement reports"
        description="Branch-wise placement performance, offer statistics and drive conversion."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Placement rate"
          value={`${placementRate}%`}
          hint={`${placedIds.size} of ${students.length} students`}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Offers made"
          value={selected.length}
          hint={`${applications.length} total applications`}
          icon={<Award className="size-4" />}
        />
        <StatCard
          label="Average CTC"
          value={avgCtc ? formatCurrency(avgCtc) : "—"}
          hint="Students marked Placed"
          icon={<IndianRupee className="size-4" />}
        />
        <StatCard
          label="Highest CTC"
          value={highestCtc ? formatCurrency(highestCtc) : "—"}
          hint={`${drives.length} drives run`}
          icon={<Briefcase className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch-wise placement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {branchRows.map((row) => (
              <div key={row.branch} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{row.branch}</span>
                  <span className="text-muted-foreground">
                    {row.placed}/{row.total} • {row.rate}%
                  </span>
                </div>
                <Progress value={row.rate} />
              </div>
            ))}
            {branchRows.length === 0 ? <EmptyState title="No student data yet" /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="capitalize">{status.replace(/_/g, " ")}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {applications.length === 0 ? <EmptyState title="No applications yet" /> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Drive conversion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {driveRows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">{row.company}</p>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {row.applied} applied • {row.selected} selected
              </div>
            </div>
          ))}
          {driveRows.length === 0 ? <EmptyState title="No drives yet" /> : null}
        </CardContent>
      </Card>
    </>
  );
}
