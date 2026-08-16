import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/drives/$driveId")({
  component: AdminDriveDetail,
});

const DRIVE_STATUSES = ["draft", "open", "closed", "completed"];
const APP_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
  "withdrawn",
];

function AdminDriveDetail() {
  const { driveId } = useParams({ from: "/_app/admin/drives/$driveId" });
  const queryClient = useQueryClient();

  const driveQuery = useQuery({
    queryKey: ["admin-drive", driveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drives")
        .select("*, company:companies(*), eligibility_rules(*), form_fields(*), recruitment_stages(*)")
        .eq("id", driveId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const appsQuery = useQuery({
    queryKey: ["admin-drive-apps", driveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, student:students(id, full_name, enrollment_no, branch, cgpa, email)")
        .eq("drive_id", driveId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const updateDrive = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("drives").update({ status }).eq("id", driveId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Drive status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-drive", driveId] });
      queryClient.invalidateQueries({ queryKey: ["drives"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateApp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application updated");
      queryClient.invalidateQueries({ queryKey: ["admin-drive-apps", driveId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (driveQuery.isLoading) return <LoadingBlock rows={6} />;
  const drive = driveQuery.data;
  if (!drive) return <EmptyState title="Drive not found" />;

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/admin/drives">
          <ArrowLeft className="mr-1 size-4" /> All drives
        </Link>
      </Button>
      <PageHeader
        title={drive.title}
        description={`${drive.company?.name ?? ""} • ${formatCurrency(drive.ctc)} • Deadline ${formatDate(drive.deadline)}`}
        actions={
          <Select value={drive.status} onValueChange={(status) => updateDrive.mutate(status)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRIVE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eligibility rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {(drive.eligibility_rules ?? []).length === 0
              ? "No rules configured — open to all students."
              : (drive.eligibility_rules ?? []).map((rule: { id: string; field: string; operator: string; value: string }) => (
                  <div key={rule.id}>
                    {rule.field} {rule.operator} {String(rule.value)}
                  </div>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {(drive.form_fields ?? []).length === 0
              ? "Default fields only."
              : (drive.form_fields ?? []).map((field: { id: string; label: string; field_type: string }) => (
                  <div key={field.id}>
                    {field.label} <span className="opacity-60">({field.field_type})</span>
                  </div>
                ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recruitment rounds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {(drive.recruitment_stages ?? []).length === 0
              ? "No rounds configured."
              : (drive.recruitment_stages ?? [])
                  .slice()
                  .sort((a: { stage_order: number }, b: { stage_order: number }) => a.stage_order - b.stage_order)
                  .map((stage: { id: string; name: string; stage_order: number }) => (
                    <div key={stage.id}>
                      {stage.stage_order}. {stage.name}
                    </div>
                  ))}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">
            Applicants <Badge variant="secondary">{(appsQuery.data ?? []).length}</Badge>
          </CardTitle>
        </CardHeader>
        {(appsQuery.data ?? []).length === 0 ? (
          <CardContent>
            <EmptyState title="No applications yet" />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(appsQuery.data ?? []).map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="font-medium">{application.student?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{application.student?.email}</div>
                  </TableCell>
                  <TableCell>{application.student?.enrollment_no}</TableCell>
                  <TableCell>{application.student?.branch ?? "—"}</TableCell>
                  <TableCell>{application.student?.cgpa ?? "—"}</TableCell>
                  <TableCell>{formatDate(application.created_at)}</TableCell>
                  <TableCell>
                    <Select
                      value={application.status}
                      onValueChange={(status) => updateApp.mutate({ id: application.id, status })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
