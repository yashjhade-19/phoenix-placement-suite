import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  getApplication,
  getApplicationResponses,
  getDriveStages,
  signedFileUrl,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  ApplicationStatusBadge,
  ErrorBlock,
  Field,
  LoadingBlock,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { RoundScheduleCard, pickScheduledRound } from "@/components/round-schedule";
import type { Stage } from "@/lib/recruitment";

export const Route = createFileRoute("/_app/applications/$applicationId")({
  component: ApplicationDetail,
});

const STAGE_ORDER = ["applied", "under_review", "shortlisted", "selected"];

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function ApplicationDetail() {
  const { applicationId } = Route.useParams();
  const queryClient = useQueryClient();

  const appQuery = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => getApplication(applicationId),
  });
  const application = appQuery.data;

  const responsesQuery = useQuery({
    queryKey: ["application-responses", applicationId],
    queryFn: () => getApplicationResponses(applicationId),
  });
  const detailedResponses = responsesQuery.data ?? [];

  const stagesQuery = useQuery({
    queryKey: ["drive-stages", application?.drive_id],
    queryFn: () => getDriveStages(application!.drive_id),
    enabled: !!application?.drive_id,
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("applications")
        .update({ status: "withdrawn" })
        .eq("id", applicationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application withdrawn");
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (appQuery.isLoading) return <LoadingBlock rows={5} />;
  if (appQuery.isError || !application)
    return <ErrorBlock message="This application could not be loaded." />;

  const responses = (application.responses ?? {}) as Record<string, unknown>;
  const currentIndex = STAGE_ORDER.indexOf(application.status);

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/applications">
          <ArrowLeft className="mr-1 size-4" /> My applications
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    {application.drive?.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.drive?.company?.name} •{" "}
                    {formatCurrency(application.drive?.ctc ?? null)}
                  </p>
                </div>
                <ApplicationStatusBadge status={application.status} />
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Applied on" value={formatDateTime(application.created_at)} />
                <Field label="Last updated" value={formatDateTime(application.updated_at)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your responses</CardTitle>
            </CardHeader>
            <CardContent>
              {detailedResponses.length > 0 ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {detailedResponses.map((row) => (
                    <div key={row.id}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="mt-1 whitespace-pre-line text-sm">
                        {["file", "resume"].includes(row.field_type) && row.value ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const url = await signedFileUrl(String(row.value));
                              if (!url) toast.error("Could not open this file");
                              else window.open(url, "_blank", "noopener");
                            }}
                          >
                            Open uploaded file
                          </Button>
                        ) : (
                          renderValue(row.value)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : Object.keys(responses).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This drive did not require additional questions.
                </p>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(responses).map(([label, value]) => (
                    <Field key={label} label={label} value={renderValue(value)} />
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {(() => {
            const r = pickScheduledRound(application, (stagesQuery.data ?? []) as unknown as Stage[]);
            return r ? <RoundScheduleCard stage={r} /> : null;
          })()}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {application.status === "rejected" || application.status === "withdrawn" ? (
                <p className="text-sm text-muted-foreground">
                  This application is {application.status}.
                </p>
              ) : (
                <ol className="space-y-4">
                  {STAGE_ORDER.map((stage, index) => (
                    <li key={stage} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                          index <= currentIndex
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          "text-sm capitalize",
                          index <= currentIndex ? "font-medium" : "text-muted-foreground",
                        )}
                      >
                        {stage.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selection rounds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stagesQuery.data ?? []).map((stage, index) => (
                <div key={stage.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className={cn(stage.id === application.current_stage_id && "font-medium text-primary")}>{index + 1}. {stage.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {stage.status === "completed" ? "Completed" : stage.scheduled_at ? formatDateTime(stage.scheduled_at) : ""}
                  </span>
                </div>
              ))}
              {(stagesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Rounds to be announced.</p>
              ) : null}
            </CardContent>
          </Card>

          {application.status !== "withdrawn" && application.status !== "selected" ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => withdraw.mutate()}
              disabled={withdraw.isPending}
            >
              Withdraw application
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
