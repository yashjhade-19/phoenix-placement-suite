import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { getApplication, getApplicationResponses, signedFileUrl } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  ApplicationStatusBadge,
  ErrorBlock,
  Field,
  LoadingBlock,
} from "@/components/common";
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
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, formatDateTime } from "@/lib/domain";
import { profileFieldLabel } from "@/lib/form-builder";
import type { ApplicationStatus } from "@/lib/types";
import { OfferManager } from "@/components/offer-manager";

export const Route = createFileRoute("/_app/admin/applications/$applicationId")({
  component: AdminApplicationDetail,
});

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function AdminApplicationDetail() {
  const { applicationId } = Route.useParams();
  const queryClient = useQueryClient();

  const appQuery = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => getApplication(applicationId),
  });
  const responsesQuery = useQuery({
    queryKey: ["application-responses", applicationId],
    queryFn: () => getApplicationResponses(applicationId),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ApplicationStatus) => {
      const { error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", applicationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application status updated");
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["offer", applicationId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function openFile(path: string | null | undefined) {
    const url = await signedFileUrl(path);
    if (!url) {
      toast.error("Could not open this file");
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  if (appQuery.isLoading) return <LoadingBlock rows={5} />;
  const application = appQuery.data;
  if (appQuery.isError || !application)
    return <ErrorBlock message="This application could not be loaded." />;

  const student = application.student;
  const responses = responsesQuery.data ?? [];
  const legacy = Object.entries((application.responses ?? {}) as Record<string, unknown>);
  const profileResponses = responses.filter((row) => row.field?.profile_field);
  const customResponses = responses.filter((row) => !row.field?.profile_field);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/admin/applications">
          <ArrowLeft className="mr-1 size-4" /> All applications
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">{student?.full_name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.drive?.title} — {application.drive?.company?.name}
                  </p>
                </div>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Select
                  value={application.status}
                  onValueChange={(status) => updateStatus.mutate(status as ApplicationStatus)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  Submitted {formatDateTime(application.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drive-specific application responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {responses.length === 0 && legacy.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This drive did not collect additional information.
                </p>
              ) : null}

              {profileResponses.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Answered from profile
                  </p>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {profileResponses.map((row) => (
                      <div key={row.id}>
                        <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {row.label}
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {profileFieldLabel(row.field?.profile_field)}
                          </Badge>
                        </dt>
                        <dd className="mt-1 text-sm">
                          {["file", "resume"].includes(row.field_type) && row.value ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openFile(String(row.value))}
                            >
                              <Download className="mr-1 size-3" /> Open file
                            </Button>
                          ) : (
                            renderValue(row.value)
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {customResponses.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Custom questions
                  </p>
                  <dl className="space-y-4">
                    {customResponses.map((row) => (
                      <div key={row.id}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="mt-1 whitespace-pre-line text-sm">
                          {["file", "resume"].includes(row.field_type) && row.value ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openFile(String(row.value))}
                            >
                              <Download className="mr-1 size-3" /> Open file
                            </Button>
                          ) : (
                            renderValue(row.value)
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {responses.length === 0 && legacy.length > 0 ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {legacy.map(([label, value]) => (
                    <Field key={label} label={label} value={renderValue(value)} />
                  ))}
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <OfferManager application={application as never} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Enrollment" value={student?.enrollment_no} />
              <Field label="Email" value={student?.email} />
              <Field label="Phone" value={student?.phone} />
              <Field label="Course" value={student?.course} />
              <Field label="Branch" value={student?.branch} />
              <Field label="Graduation year" value={student?.graduation_year?.toString()} />
              <Field label="CGPA" value={student?.cgpa?.toString()} />
              <Field label="Active backlogs" value={student?.active_backlogs?.toString()} />
              <Field label="Skills" value={(student?.skills ?? []).join(", ") || "—"} />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!student?.resume_url}
                onClick={() => void openFile(student?.resume_url)}
              >
                <Download className="mr-1 size-4" /> Profile resume
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
