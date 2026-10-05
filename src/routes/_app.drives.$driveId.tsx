import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  getDrive,
  getDriveFields,
  getDriveRules,
  getDriveStages,
  listApplications,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getBlockReason } from "@/lib/offers";
import { evaluateEligibility, isBatchEligible } from "@/lib/eligibility";
import {
  ApplicationStatusBadge,
  DriveStatusBadge,
  ErrorBlock,
  Field,
  LoadingBlock,
} from "@/components/common";
import { EligibilityPanel } from "@/components/eligibility-panel";
import { DynamicFormField, validateResponses, type FormResponses } from "@/components/dynamic-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  formatCurrency,
  formatDate,
  formatDateTime,
  isDeadlinePassed,
} from "@/lib/domain";
import { buildInitialResponses, readValidation } from "@/lib/form-builder";

export const Route = createFileRoute("/_app/drives/$driveId")({
  component: DriveDetail,
});

function DriveDetail() {
  const { driveId } = Route.useParams();
  const { student } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<FormResponses>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const driveQuery = useQuery({ queryKey: ["drive", driveId], queryFn: () => getDrive(driveId) });
  const rulesQuery = useQuery({
    queryKey: ["drive-rules", driveId],
    queryFn: () => getDriveRules(driveId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["drive-fields", driveId],
    queryFn: () => getDriveFields(driveId),
  });
  const stagesQuery = useQuery({
    queryKey: ["drive-stages", driveId],
    queryFn: () => getDriveStages(driveId),
  });
  const appsQuery = useQuery({
    queryKey: ["applications", "me", student?.id],
    queryFn: () => listApplications({ studentId: student?.id }),
    enabled: !!student?.id,
  });

  const drive = driveQuery.data;
  const rules = rulesQuery.data ?? [];
  const fields = fieldsQuery.data ?? [];
  const existing = (appsQuery.data ?? []).find((a) => a.drive_id === driveId);

  const eligibility = useMemo(() => evaluateEligibility(student, rules), [student, rules]);
  const batchOk = isBatchEligible(student, drive?.eligible_batches ?? []);

  // Prefill fields that are linked to the student's platform profile.
  useEffect(() => {
    if (fields.length === 0) return;
    const prefilled = buildInitialResponses(fields, student);
    if (Object.keys(prefilled).length === 0) return;
    setResponses((prev) => ({ ...prefilled, ...prev }));
  }, [fields, student]);

  async function uploadAttachment(file: File, field: (typeof fields)[number]) {
    if (!student) return null;
    const rules = readValidation(field);
    const maxMb = rules.maxSizeMb ?? 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File must be under ${maxMb} MB`);
      return null;
    }
    const accept = rules.accept ?? (field.field_type === "resume" ? ".pdf,.doc,.docx" : "");
    if (accept) {
      const allowed = accept.split(",").map((ext) => ext.trim().toLowerCase()).filter(Boolean);
      const ok = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!ok) {
        toast.error(`Allowed file types: ${allowed.join(", ")}`);
        return null;
      }
    }
    const path = `${student.user_id}/drives/${driveId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return path;
  }

  const policyQuery = useQuery({
    queryKey: ["policy-block", student?.id, driveId],
    queryFn: () => getBlockReason(student!.id, driveId),
    enabled: !!student?.id,
  });
  const policyBlock = policyQuery.data ?? null;

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!student || !drive) throw new Error("Missing profile");
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        payload[field.label] = responses[field.id] ?? null;
      }
      const { data, error } = await supabase
        .from("applications")
        .insert({
          org_id: drive.org_id,
          drive_id: drive.id,
          student_id: student.id,
          responses: payload as never,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (fields.length > 0) {
        const rows = fields.map((field) => ({
          application_id: data.id,
          field_id: field.id,
          label: field.label,
          field_type: field.field_type,
          value: (responses[field.id] ?? null) as never,
        }));
        const { error: responseError } = await supabase
          .from("application_responses")
          .insert(rows);
        if (responseError) throw new Error(responseError.message);
      }
    },
    onSuccess: () => {
      toast.success("Application submitted");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      navigate({ to: "/applications" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase
        .from("applications")
        .update({ status: "withdrawn" })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application withdrawn");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (driveQuery.isLoading) return <LoadingBlock rows={6} />;
  if (driveQuery.isError || !drive)
    return <ErrorBlock message="This drive could not be loaded." />;

  const closed = drive.status !== "applications_open" || isDeadlinePassed(drive.deadline);
  const canApply = !closed && eligibility.eligible && batchOk && !existing && !policyBlock;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateResponses(fields, responses);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    applyMutation.mutate();
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/drives">
          <ArrowLeft className="mr-1 size-4" /> All drives
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{drive.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {drive.company?.name} • {drive.company?.industry ?? "—"}
                  </p>
                </div>
                <DriveStatusBadge status={drive.status} />
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <Field label="CTC" value={formatCurrency(drive.ctc)} />
                <Field label="Stipend" value={formatCurrency(drive.stipend)} />
                <Field
                  label="Type"
                  value={EMPLOYMENT_TYPES[drive.employment_type] ?? drive.employment_type}
                />
                <Field label="Work mode" value={WORK_MODES[drive.work_mode] ?? drive.work_mode} />
                <Field label="Location" value={drive.location} />
                <Field label="Batches" value={drive.eligible_batches.join(", ")} />
                <Field label="Applications open" value={formatDateTime(drive.opens_at)} />
                <Field label="Deadline" value={formatDateTime(drive.deadline)} />
                <Field label="Drive date" value={formatDate(drive.drive_date)} />
              </dl>

              {drive.description ? (
                <>
                  <Separator className="my-6" />
                  <h2 className="text-sm font-semibold">Role description</h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {drive.description}
                  </p>
                </>
              ) : null}

              {drive.benefits ? (
                <>
                  <Separator className="my-6" />
                  <h2 className="text-sm font-semibold">Benefits</h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {drive.benefits}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selection process</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {(stagesQuery.data ?? []).map((stage, index) => (
                  <li key={stage.id} className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm">{stage.name}</span>
                  </li>
                ))}
                {(stagesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Selection rounds will be announced by the placement cell.
                  </p>
                ) : null}
              </ol>
            </CardContent>
          </Card>

          {showForm && canApply ? (
            <Card id="apply">
              <CardHeader>
                <CardTitle className="text-base">Application form</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-5">
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No extra questions — submit to confirm your application.
                    </p>
                  ) : (
                    fields.map((field) => (
                      <DynamicFormField
                        key={field.id}
                        field={field}
                        value={responses[field.id]}
                        fromProfile={!!field.profile_field}
                        onUpload={(file) => uploadAttachment(file, field)}
                        {...(errors[field.id] ? { error: errors[field.id] } : {})}
                        onChange={(value) =>
                          setResponses((prev) => ({ ...prev, [field.id]: value }))
                        }
                      />
                    ))
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={applyMutation.isPending}>
                      {applyMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Submit application
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EligibilityPanel
                result={eligibility}
                batchOk={batchOk}
                batches={drive.eligible_batches}
              />

              {existing ? (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your application</span>
                    <ApplicationStatusBadge status={existing.status} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/applications/$applicationId"
                        params={{ applicationId: existing.id }}
                      >
                        View
                      </Link>
                    </Button>
                    {existing.status !== "withdrawn" && !closed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => withdrawMutation.mutate()}
                        disabled={withdrawMutation.isPending}
                      >
                        Withdraw
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : closed ? (
                <p className="text-sm text-muted-foreground">
                  Applications are currently closed for this drive.
                </p>
              ) : policyBlock ? (
                <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                  <p className="font-medium">Not allowed by placement policy</p>
                  <p className="mt-1 text-muted-foreground">{policyBlock}</p>
                </div>
              ) : (
                <Button className="w-full" disabled={!canApply} onClick={() => setShowForm(true)}>
                  {canApply ? "Apply now" : "Not eligible to apply"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">About {drive.company?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{drive.company?.description ?? "—"}</p>
              <Field label="Industry" value={drive.company?.industry} />
              <Field label="Headquarters" value={drive.company?.location} />
              <Field
                label="Website"
                value={
                  drive.company?.website ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={drive.company.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {drive.company.website}
                    </a>
                  ) : null
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
