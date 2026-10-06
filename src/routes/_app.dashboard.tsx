import { listOffers } from "@/lib/offers";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, CalendarClock, FileText, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { listApplications, listDrives, getDriveRules, listAnnouncements } from "@/lib/api";
import { evaluateEligibility, isBatchEligible } from "@/lib/eligibility";
import {
  ApplicationStatusBadge,
  DriveStatusBadge,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
} from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, daysLeft, profileCompletion } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { student, fullName } = useAuth();

  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const appsQuery = useQuery({
    queryKey: ["applications", "me", student?.id],
    queryFn: () => listApplications({ studentId: student?.id }),
    enabled: !!student?.id,
  });
  const announcementsQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: listAnnouncements,
  });

  const rulesQuery = useQuery({
    queryKey: ["all-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eligibility_rules").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const drives = drivesQuery.data ?? [];
  const applications = appsQuery.data ?? [];
  const appliedDriveIds = new Set(applications.map((a) => a.drive_id));
  const openDrives = drives.filter((d) => d.status === "applications_open");

  const eligibleOpen = openDrives.filter((drive) => {
    const rules = (rulesQuery.data ?? []).filter((r) => r.drive_id === drive.id);
    return (
      isBatchEligible(student, drive.eligible_batches) &&
      evaluateEligibility(student, rules).eligible
    );
  });

  const offersQ = useQuery({
    queryKey: ["offers", "me", student?.id],
    queryFn: () => listOffers({ studentId: student!.id }),
    enabled: !!student?.id,
  });
  const myOffers = offersQ.data ?? [];
  const placedOffer = myOffers.find((o) => o.status === "placed");
  const pendingOffers = myOffers.filter((o) => o.status === "released" || o.status === "accepted").length;
  const completion = profileCompletion(student);

  if (drivesQuery.isLoading || appsQuery.isLoading) {
    return <LoadingBlock rows={6} />;
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${(fullName ?? "Student").split(" ")[0]}`}
        description="Your placement snapshot for this academic year."
        actions={
          <Button asChild>
            <Link to="/drives">Browse drives</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open drives"
          value={openDrives.length}
          hint={`${eligibleOpen.length} you're eligible for`}
          icon={<Briefcase className="size-4" />}
        />
        <StatCard
          label="Applications"
          value={applications.length}
          hint="Total submitted"
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Offers"
          value={myOffers.length}
          hint={placedOffer ? `Placed · ${placedOffer.company?.name}` : pendingOffers ? `${pendingOffers} awaiting your response` : "Unplaced"}
          icon={<Trophy className="size-4" />}
        />
        <StatCard
          label="Profile strength"
          value={`${completion}%`}
          hint={completion < 100 ? "Complete it to unlock more drives" : "All set"}
          icon={<CalendarClock className="size-4" />}
        />
      </div>

      {completion < 100 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <p className="text-sm font-medium">Complete your placement profile</p>
              <Progress value={completion} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                Recruiters and eligibility checks use these details.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/profile">Update profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Drives you can apply to</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/drives">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {eligibleOpen.length === 0 ? (
              <EmptyState
                title="No eligible open drives right now"
                description="New opportunities appear here as the placement cell publishes them."
              />
            ) : (
              eligibleOpen.slice(0, 5).map((drive) => {
                const left = daysLeft(drive.deadline);
                return (
                  <Link
                    key={drive.id}
                    to="/drives/$driveId"
                    params={{ driveId: drive.id }}
                    className="flex items-center justify-between gap-4 rounded-md border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{drive.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {drive.company?.name} • {formatCurrency(drive.ctc)} •{" "}
                        {drive.location ?? "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {appliedDriveIds.has(drive.id) ? (
                        <span className="text-xs font-medium text-success">Applied</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {left !== null && left >= 0 ? `${left}d left` : formatDate(drive.deadline)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.length === 0 ? (
              <EmptyState title="No applications yet" />
            ) : (
              applications.slice(0, 5).map((application) => (
                <Link
                  key={application.id}
                  to="/applications/$applicationId"
                  params={{ applicationId: application.id }}
                  className="block rounded-md border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{application.drive?.title}</p>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {application.drive?.company?.name}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Latest announcements</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/announcements">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(announcementsQuery.data ?? []).slice(0, 3).map((announcement) => (
            <div key={announcement.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{announcement.title}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDate(announcement.publish_at)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {announcement.content}
              </p>
            </div>
          ))}
          {(announcementsQuery.data ?? []).length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 hidden">
        <DriveStatusBadge status="draft" />
      </div>
    </>
  );
}
