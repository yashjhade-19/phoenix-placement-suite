import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Building2, FileText, GraduationCap } from "lucide-react";
import { listOffers } from "@/lib/offers";
import { listApplications, listCompanies, listDrives, listStudents } from "@/lib/api";
import {
  ApplicationStatusBadge,
  DriveStatusBadge,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: listCompanies });
  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications() });
  const offersQuery = useQuery({ queryKey: ["offers"], queryFn: () => listOffers() });

  if (studentsQuery.isLoading || drivesQuery.isLoading || appsQuery.isLoading)
    return <LoadingBlock rows={6} />;

  const students = studentsQuery.data ?? [];
  const drives = drivesQuery.data ?? [];
  const applications = appsQuery.data ?? [];
  void applications;
  const placed = new Set(
    (offersQuery.data ?? []).filter((o) => o.status === "accepted").map((o) => o.student_id),
  );
  const placementRate = students.length
    ? Math.round((placed.size / students.length) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Placement overview"
        description="Live snapshot of recruitment activity across the campus."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/companies">Add company</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/drives/new">Create drive</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered students"
          value={students.length}
          hint={`${placed.size} placed`}
          icon={<GraduationCap className="size-4" />}
        />
        <StatCard
          label="Recruiters"
          value={(companiesQuery.data ?? []).length}
          hint="Companies onboarded"
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Drives"
          value={drives.length}
          hint={`${drives.filter((d) => d.status === "applications_open").length} accepting applications`}
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          label="Placement rate"
          value={`${placementRate}%`}
          hint={`${applications.length} applications received`}
          icon={<FileText className="size-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Active drives</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/drives">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {drives.slice(0, 6).map((drive) => {
              const count = applications.filter((a) => a.drive_id === drive.id).length;
              return (
                <Link
                  key={drive.id}
                  to="/admin/drives/$driveId"
                  params={{ driveId: drive.id }}
                  className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{drive.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {drive.company?.name} • {formatCurrency(drive.ctc)} • closes{" "}
                      {formatDate(drive.deadline)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{count} applied</span>
                    <DriveStatusBadge status={drive.status} />
                  </div>
                </Link>
              );
            })}
            {drives.length === 0 ? <EmptyState title="No drives created yet" /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/applications">Review</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.slice(0, 6).map((application) => (
              <div key={application.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{application.student?.full_name}</p>
                  <ApplicationStatusBadge status={application.status} />
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {application.drive?.title}
                </p>
              </div>
            ))}
            {applications.length === 0 ? <EmptyState title="No applications yet" /> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
