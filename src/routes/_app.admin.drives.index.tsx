import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listApplications, listDrives } from "@/lib/api";
import { DriveStatusBadge, EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/drives/")({
  component: AdminDrives,
});

function AdminDrives() {
  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications() });

  if (drivesQuery.isLoading) return <LoadingBlock rows={6} />;
  const drives = drivesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Placement drives"
        description="Create, publish and manage recruitment drives."
        actions={
          <Button asChild>
            <Link to="/admin/drives/new">Create drive</Link>
          </Button>
        }
      />

      {drives.length === 0 ? (
        <EmptyState title="No drives yet" description="Create your first placement drive." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>CTC</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drives.map((drive) => (
                <TableRow key={drive.id}>
                  <TableCell className="font-medium">{drive.title}</TableCell>
                  <TableCell>{drive.company?.name}</TableCell>
                  <TableCell>{formatCurrency(drive.ctc)}</TableCell>
                  <TableCell>{formatDate(drive.deadline)}</TableCell>
                  <TableCell>
                    {(appsQuery.data ?? []).filter((a) => a.drive_id === drive.id).length}
                  </TableCell>
                  <TableCell>
                    <DriveStatusBadge status={drive.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin/drives/$driveId" params={{ driveId: drive.id }}>
                        Open
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
