import { DossierButton } from "@/components/dossier-button";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormBuilder } from "@/components/form-builder";
import { FormPreview } from "@/components/form-preview";
import type { FormField } from "@/lib/types";
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
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/domain";
import { EligibilityBuilder } from "@/components/eligibility-builder";
import { RecruitmentManager } from "@/components/recruitment-manager";
import type { Stage } from "@/lib/recruitment";
import type { EligibilityRule } from "@/lib/types";

export const Route = createFileRoute("/_app/admin/drives/$driveId")({
  component: AdminDriveDetail,
});

const DRIVE_STATUSES = [
  "draft",
  "published",
  "applications_open",
  "applications_closed",
  "selection_in_progress",
  "completed",
] as const;
type DriveStatus = (typeof DRIVE_STATUSES)[number];
const APP_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "selected",
  "rejected",
  "withdrawn",
] as const;
type AppStatus = (typeof APP_STATUSES)[number];

const LOCKED_STATUSES: DriveStatus[] = [
  "applications_closed",
  "selection_in_progress",
  "completed",
];

function AdminDriveDetail() {
  const { driveId } = useParams({ from: "/_app/admin/drives/$driveId" });
  const queryClient = useQueryClient();

  const driveQuery = useQuery({
    queryKey: ["admin-drive", driveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drives")
        .select(
          "*, company:companies(*), eligibility_rules(*), form_fields(*), recruitment_stages(*)",
        )
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
    mutationFn: async (status: DriveStatus) => {
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
    mutationFn: async ({ id, status }: { id: string; status: AppStatus }) => {
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

  const fields = ((drive.form_fields ?? []) as FormField[])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const stages = (drive.recruitment_stages ?? [])
    .slice()
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
  const rules = drive.eligibility_rules ?? [];
  const formLocked = LOCKED_STATUSES.includes(drive.status as DriveStatus);
  const applications = appsQuery.data ?? [];

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
          <Select
            value={drive.status}
            onValueChange={(status) => updateDrive.mutate(status as DriveStatus)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRIVE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="details">
        <TabsList className="mb-6 flex w-full flex-wrap justify-start">
          <TabsTrigger value="details">1. Drive details</TabsTrigger>
          <TabsTrigger value="eligibility">2. Eligibility</TabsTrigger>
          <TabsTrigger value="form">3. Application form</TabsTrigger>
          <TabsTrigger value="rounds">4. Recruitment</TabsTrigger>
          <TabsTrigger value="preview">5. Preview &amp; publish</TabsTrigger>
          <TabsTrigger value="applicants">
            Applicants <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drive details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
              <Detail label="Company" value={drive.company?.name} />
              <Detail label="Position" value={drive.title} />
              <Detail
                label="Employment type"
                value={EMPLOYMENT_TYPES[drive.employment_type] ?? drive.employment_type}
              />
              <Detail label="Work mode" value={WORK_MODES[drive.work_mode] ?? drive.work_mode} />
              <Detail label="Location" value={drive.location} />
              <Detail label="CTC" value={formatCurrency(drive.ctc)} />
              <Detail label="Stipend" value={formatCurrency(drive.stipend)} />
              <Detail label="Applications open" value={formatDateTime(drive.opens_at)} />
              <Detail label="Deadline" value={formatDateTime(drive.deadline)} />
              <Detail label="Drive date" value={formatDate(drive.drive_date)} />
              <Detail label="Eligible batches" value={drive.eligible_batches.join(", ")} />
              <div className="sm:col-span-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {drive.description ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligibility">
          <EligibilityBuilder
            driveId={driveId}
            rules={rules as EligibilityRule[]}
            batches={drive.eligible_batches}
          />
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardContent className="p-6">
              <FormBuilder
                driveId={driveId}
                fields={fields}
                readOnly={formLocked}
                readOnlyReason="Applications are closed for this drive, so the form is read-only. Historical applications stay viewable."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounds">
          <RecruitmentManager
            driveId={driveId}
            stages={stages as Stage[]}
            applications={applications as never}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <FormPreview title={`${drive.title} application`} fields={fields} />
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                Current status: <span className="font-medium">{drive.status.replace(/_/g, " ")}</span>
              </p>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  disabled={drive.status !== "draft" || updateDrive.isPending}
                  onClick={() => updateDrive.mutate("published")}
                >
                  Publish drive
                </Button>
                <Button
                  disabled={drive.status === "applications_open" || updateDrive.isPending}
                  onClick={() => updateDrive.mutate("applications_open")}
                >
                  Open applications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applicants">
          {applications.some((a) => a.status === "shortlisted" || a.status === "selected") ? (
            <div className="mb-3 flex justify-end">
              <DossierButton
                label="Download shortlisted dossier"
                title={`${drive.company?.name ?? ""} ${drive.title}`}
                ids={applications.filter((a) => a.status === "shortlisted" || a.status === "selected").map((a) => a.id)}
              />
            </div>
          ) : null}
          <Card className="overflow-hidden">
            {applications.length === 0 ? (
              <CardContent className="pt-6">
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="font-medium">{application.student?.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {application.student?.email}
                        </div>
                      </TableCell>
                      <TableCell>{application.student?.enrollment_no}</TableCell>
                      <TableCell>{application.student?.branch ?? "—"}</TableCell>
                      <TableCell>{application.student?.cgpa ?? "—"}</TableCell>
                      <TableCell>{formatDate(application.created_at)}</TableCell>
                      <TableCell>
                        <Select
                          value={application.status}
                          onValueChange={(status) =>
                            updateApp.mutate({ id: application.id, status: status as AppStatus })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APP_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to="/admin/applications/$applicationId"
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
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value ?? "—"}</p>
    </div>
  );
}
