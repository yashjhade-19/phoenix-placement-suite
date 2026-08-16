import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
                <TableRow key={application.id}>
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
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
