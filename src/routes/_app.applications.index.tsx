import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationTracker } from "@/components/application-tracker";
import { RoundScheduleCard, pickScheduledRound } from "@/components/round-schedule";
import { buildTracker, type RoundResultRow, type Stage } from "@/lib/recruitment";
import { listApplications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ApplicationStatusBadge,
  EmptyState,
  LoadingBlock,
  PageHeader,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_app/applications/")({
  component: MyApplications,
});

function MyApplications() {
  const { student } = useAuth();
  const [status, setStatus] = useState("all");

  const appsQuery = useQuery({
    queryKey: ["applications", "me", student?.id],
    queryFn: () => listApplications({ studentId: student?.id }),
    enabled: !!student?.id,
  });

  const driveIds = [...new Set((appsQuery.data ?? []).map((a) => a.drive_id))];
  const trackQuery = useQuery({
    queryKey: ["my-tracking", student?.id, driveIds.join(",")],
    enabled: driveIds.length > 0,
    queryFn: async () => {
      const [st, rr] = await Promise.all([
        supabase.from("recruitment_stages").select("*").in("drive_id", driveIds),
        supabase
          .from("application_round_results")
          .select("id, application_id, stage_id, result")
          .in("application_id", (appsQuery.data ?? []).map((a) => a.id)),
      ]);
      if (st.error) throw new Error(st.error.message);
      if (rr.error) throw new Error(rr.error.message);
      return { stages: (st.data ?? []) as Stage[], results: (rr.data ?? []) as RoundResultRow[] };
    },
  });

  if (appsQuery.isLoading) return <LoadingBlock rows={5} />;

  const applications = (appsQuery.data ?? []).filter(
    (a) => status === "all" || a.status === status,
  );

  return (
    <>
      <PageHeader
        title="My applications"
        description="Track every drive you've applied to and its current stage."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {APPLICATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {APPLICATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Browse open drives and apply to the ones you're eligible for."
          action={
            <Button asChild>
              <Link to="/drives">Browse drives</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Applied on</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <Fragment key={application.id}>
                <TableRow className="border-b-0">
                  <TableCell className="font-medium">{application.drive?.title}</TableCell>
                  <TableCell>{application.drive?.company?.name}</TableCell>
                  <TableCell>{formatDate(application.created_at)}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={application.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/applications/$applicationId"
                        params={{ applicationId: application.id }}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="pt-0">
                    <ApplicationTracker
                      steps={buildTracker(
                        application,
                        (trackQuery.data?.stages ?? []).filter((s) => s.drive_id === application.drive_id),
                        (trackQuery.data?.results ?? []).filter((r) => r.application_id === application.id),
                      )}
                    />
                    {(() => {
                      const r = pickScheduledRound(
                        application,
                        (trackQuery.data?.stages ?? []).filter((s) => s.drive_id === application.drive_id),
                      );
                      return r ? <div className="mt-3 max-w-2xl"><RoundScheduleCard stage={r} compact /></div> : null;
                    })()}
                  </TableCell>
                </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
