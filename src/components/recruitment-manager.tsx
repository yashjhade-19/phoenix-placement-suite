import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationStatusBadge, EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/domain";
import type { ApplicationStatus } from "@/lib/types";
import {
  ROUND_RESULTS,
  ROUND_STATUSES,
  ROUND_TYPES,
  type RoundResultRow,
  type Stage,
} from "@/lib/recruitment";

type App = {
  id: string;
  status: ApplicationStatus;
  current_stage_id: string | null;
  student: { full_name: string; enrollment_no: string; branch: string | null; cgpa: number | null } | null;
};

type Draft = Omit<Stage, "id" | "drive_id" | "sort_order"> & { id?: string };

const emptyDraft: Draft = {
  name: "",
  round_type: "technical_interview",
  description: "",
  scheduled_at: null,
  mode: "online",
  location: "",
  status: "upcoming",
};

const resultTone: Record<string, string> = {
  pending: "text-muted-foreground",
  qualified: "text-success",
  not_qualified: "text-destructive",
  absent: "text-warning-foreground",
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function RecruitmentManager({
  driveId,
  stages: rawStages,
  applications,
}: {
  driveId: string;
  stages: Stage[];
  applications: App[];
}) {
  const queryClient = useQueryClient();
  const stages = useMemo(
    () => rawStages.slice().sort((a, b) => a.sort_order - b.sort_order),
    [rawStages],
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Stage | null>(null);
  const [openRound, setOpenRound] = useState<string | null>(null);

  const resultsQuery = useQuery({
    queryKey: ["round-results", driveId, stages.map((s) => s.id).join(",")],
    enabled: stages.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_round_results")
        .select("id, application_id, stage_id, result")
        .in(
          "stage_id",
          stages.map((s) => s.id),
        );
      if (error) throw new Error(error.message);
      return (data ?? []) as RoundResultRow[];
    },
  });
  const results = resultsQuery.data ?? [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-drive", driveId] });
    queryClient.invalidateQueries({ queryKey: ["admin-drive-apps", driveId] });
    queryClient.invalidateQueries({ queryKey: ["round-results", driveId] });
    queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
  };

  const saveRound = useMutation({
    mutationFn: async (d: Draft) => {
      if (!d.name.trim()) throw new Error("Round name is required");
      const payload = {
        name: d.name.trim(),
        round_type: d.round_type,
        description: d.description?.trim() || null,
        scheduled_at: d.scheduled_at || null,
        mode: d.mode,
        location: d.location?.trim() || null,
        status: d.status,
      };
      if (d.id) {
        const { error } = await supabase.from("recruitment_stages").update(payload).eq("id", d.id);
        if (error) throw new Error(error.message);
      } else {
        const next = Math.max(0, ...stages.map((s) => s.sort_order)) + 1;
        const { error } = await supabase
          .from("recruitment_stages")
          .insert({ ...payload, drive_id: driveId, sort_order: next });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Round saved");
      setDraft(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRound = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_stages").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Round deleted");
      setDeleting(null);
      setOpenRound(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const a = stages[index];
      const b = stages[index + dir];
      if (!a || !b) return;
      const r1 = await supabase.from("recruitment_stages").update({ sort_order: b.sort_order }).eq("id", a.id);
      const r2 = await supabase.from("recruitment_stages").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (r1.error || r2.error) throw new Error((r1.error ?? r2.error)!.message);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const setResult = useMutation({
    mutationFn: async ({ appId, stageId, result }: { appId: string; stageId: string; result: string }) => {
      const { error } = await supabase
        .from("application_round_results")
        .upsert({ application_id: appId, stage_id: stageId, result }, { onConflict: "application_id,stage_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["round-results", driveId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveTo = useMutation({
    mutationFn: async ({ appIds, stageId }: { appIds: string[]; stageId: string }) => {
      if (appIds.length === 0) throw new Error("No applicants to move");
      const { error } = await supabase
        .from("applications")
        .update({ current_stage_id: stageId, status: "shortlisted" })
        .in("id", appIds);
      if (error) throw new Error(error.message);
      const { error: e2 } = await supabase.from("application_round_results").upsert(
        appIds.map((id) => ({ application_id: id, stage_id: stageId, result: "pending" })),
        { onConflict: "application_id,stage_id", ignoreDuplicates: true },
      );
      if (e2) throw new Error(e2.message);
    },
    onSuccess: (_d, v) => {
      toast.success(`${v.appIds.length} applicant${v.appIds.length > 1 ? "s" : ""} moved`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalize = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: "selected" | "rejected" }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "selected" ? "Marked as selected" : "Marked as rejected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = applications.filter((a) => a.status !== "withdrawn");
  const readyForRound1 = active.filter((a) => a.status === "shortlisted" && !a.current_stage_id);
  const countFor = (stageId: string, result: string) =>
    results.filter((r) => r.stage_id === stageId && r.result === result).length;

  const progress = [
    { label: "Applied", value: active.length },
    {
      label: "Shortlisted",
      value: active.filter((a) => a.status === "shortlisted" || a.status === "selected" || a.current_stage_id).length,
    },
    ...stages.map((s) => ({
      label: s.name,
      value: new Set(results.filter((r) => r.stage_id === s.id).map((r) => r.application_id)).size,
    })),
    { label: "Selected", value: active.filter((a) => a.status === "selected").length },
  ];

  const round = stages.find((s) => s.id === openRound) ?? null;
  const roundIndex = round ? stages.indexOf(round) : -1;
  const nextStage = roundIndex >= 0 ? stages[roundIndex + 1] : undefined;
  const roundApps = round
    ? active.filter(
        (a) => a.current_stage_id === round.id || results.some((r) => r.application_id === a.id && r.stage_id === round.id),
      )
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recruitment pipeline</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {stages.length} round{stages.length === 1 ? "" : "s"} configured for this drive
            </p>
          </div>
          {stages.length > 0 ? (
            <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
              <Plus className="mr-1 size-4" /> Add round
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <EmptyState
              title="No recruitment rounds configured"
              description="Define this company's selection process, e.g. Aptitude → Technical → HR."
              action={
                <Button onClick={() => setDraft({ ...emptyDraft })}>
                  <Plus className="mr-1 size-4" /> Add first round
                </Button>
              }
            />
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-stretch gap-2">
                  <div
                    className={cn(
                      "w-60 shrink-0 rounded-md border bg-card p-3",
                      openRound === stage.id && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Round {index + 1}</p>
                        <p className="font-medium leading-tight">{stage.name}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {ROUND_STATUSES[stage.status] ?? stage.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ROUND_TYPES[stage.round_type] ?? stage.round_type} ·{" "}
                      {stage.mode === "offline" ? "Offline" : "Online"}
                    </p>
                    {stage.scheduled_at ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3" /> {formatDateTime(stage.scheduled_at)}
                      </p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      {Object.entries(ROUND_RESULTS).map(([key, label]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={cn("font-medium tabular-nums", resultTone[key])}>
                            {countFor(stage.id, key)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-1 border-t pt-2">
                      <Button
                        size="sm"
                        variant={openRound === stage.id ? "default" : "outline"}
                        className="h-7 flex-1 text-xs"
                        onClick={() => setOpenRound(openRound === stage.id ? null : stage.id)}
                      >
                        <Users className="mr-1 size-3" /> Applicants
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Move earlier" disabled={index === 0 || move.isPending} onClick={() => move.mutate({ index, dir: -1 })}>
                        <ArrowUp className="size-3.5 -rotate-90" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Move later" disabled={index === stages.length - 1 || move.isPending} onClick={() => move.mutate({ index, dir: 1 })}>
                        <ArrowDown className="size-3.5 -rotate-90" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" aria-label="Edit round" onClick={() => setDraft({ ...stage })}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Delete round" onClick={() => setDeleting(stage)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {index < stages.length - 1 ? (
                    <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Drive progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {progress.map((p, i) => (
            <div key={`${p.label}-${i}`} className="flex items-center gap-2">
              <div className="rounded-md border px-3 py-2 text-center">
                <p className="text-lg font-semibold tabular-nums">{p.value}</p>
                <p className="text-xs text-muted-foreground">{p.label}</p>
              </div>
              {i < progress.length - 1 ? <ArrowRight className="size-3 text-muted-foreground" /> : null}
            </div>
          ))}
          {stages.length > 0 && readyForRound1.length > 0 ? (
            <Button
              className="ml-auto"
              size="sm"
              disabled={moveTo.isPending}
              onClick={() => moveTo.mutate({ appIds: readyForRound1.map((a) => a.id), stageId: stages[0]!.id })}
            >
              Move {readyForRound1.length} shortlisted to {stages[0]!.name}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {round ? (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                Round {roundIndex + 1}: {round.name}
              </CardTitle>
              <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {round.description ? <span>{round.description}</span> : null}
                {round.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {round.location}
                  </span>
                ) : null}
              </p>
            </div>
            {nextStage ? (
              <Button
                size="sm"
                variant="outline"
                disabled={moveTo.isPending}
                onClick={() => {
                  const ids = roundApps
                    .filter(
                      (a) =>
                        a.current_stage_id === round.id &&
                        results.some((r) => r.application_id === a.id && r.stage_id === round.id && r.result === "qualified"),
                    )
                    .map((a) => a.id);
                  moveTo.mutate({ appIds: ids, stageId: nextStage.id });
                }}
              >
                Advance all qualified to {nextStage.name}
              </Button>
            ) : null}
          </CardHeader>
          {roundApps.length === 0 ? (
            <CardContent>
              <EmptyState
                title="No applicants in this round yet"
                description={
                  roundIndex === 0
                    ? "Shortlist applicants, then move them into the first round."
                    : "Advance qualified applicants from the previous round."
                }
              />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>CGPA</TableHead>
                  <TableHead className="w-44">Round outcome</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead className="text-right">Next step</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roundApps.map((app) => {
                  const res = results.find((r) => r.application_id === app.id && r.stage_id === round.id)?.result ?? "pending";
                  const isHere = app.current_stage_id === round.id;
                  const finalDone = app.status === "selected" || app.status === "rejected";
                  return (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="font-medium">{app.student?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{app.student?.enrollment_no}</div>
                      </TableCell>
                      <TableCell>{app.student?.branch ?? "—"}</TableCell>
                      <TableCell>{app.student?.cgpa ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={res}
                          disabled={!isHere || finalDone}
                          onValueChange={(result) => setResult.mutate({ appId: app.id, stageId: round.id, result })}
                        >
                          <SelectTrigger className={cn("h-8", resultTone[res])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROUND_RESULTS).map(([k, l]) => (
                              <SelectItem key={k} value={k}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <ApplicationStatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {!isHere ? (
                          <span className="text-xs text-muted-foreground">Moved on</span>
                        ) : finalDone ? (
                          <span className="text-xs text-muted-foreground">Final decision recorded</span>
                        ) : res === "qualified" && nextStage ? (
                          <Button size="sm" variant="outline" onClick={() => moveTo.mutate({ appIds: [app.id], stageId: nextStage.id })}>
                            Advance to {nextStage.name}
                          </Button>
                        ) : res === "qualified" ? (
                          <Button size="sm" onClick={() => finalize.mutate({ appId: app.id, status: "selected" })}>
                            Mark selected
                          </Button>
                        ) : res === "not_qualified" || res === "absent" ? (
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => finalize.mutate({ appId: app.id, status: "rejected" })}>
                            Mark rejected
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Awaiting outcome</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      ) : null}

      {draft ? (
        <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit round" : "Add recruitment round"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Round name</Label>
                <Input value={draft.name} placeholder="e.g. Technical Interview" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Round type</Label>
                <Select value={draft.round_type} onValueChange={(v) => setDraft({ ...draft, round_type: v, name: draft.name || ROUND_TYPES[v] || "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUND_TYPES).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUND_STATUSES).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={draft.mode} onValueChange={(v) => setDraft({ ...draft, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled (optional)</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(draft.scheduled_at)}
                  onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{draft.mode === "offline" ? "Venue (optional)" : "Meeting link / info (optional)"}</Label>
                <Input value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button disabled={saveRound.isPending} onClick={() => saveRound.mutate(draft)}>
                {saveRound.isPending ? "Saving…" : "Save round"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Recorded outcomes for this round will be removed. Applicants currently in it will return to the shortlisted pool.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteRound.mutate(deleting.id)}>Delete round</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
