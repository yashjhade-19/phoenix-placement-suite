import { CalendarClock, CalendarDays, Clock, ExternalLink, MapPin, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROUND_TYPES, type Stage } from "@/lib/recruitment";

type Sched = Pick<Stage, "id" | "name" | "round_type" | "description" | "scheduled_at" | "mode" | "location" | "status">;

/** Picks the round to surface for an application: the current round, if it has any schedule info. */
export function pickScheduledRound(
  app: { status: string; current_stage_id: string | null },
  stages: Sched[],
): Sched | null {
  if (["rejected", "withdrawn", "selected"].includes(app.status)) return null;
  const s = stages.find((x) => x.id === app.current_stage_id);
  if (!s) return null;
  if (!s.scheduled_at && !s.location && !s.description) return null;
  return s;
}

function isUrl(v: string) {
  return /^https?:\/\//i.test(v.trim());
}

export function RoundScheduleCard({ stage, compact = false }: { stage: Sched; compact?: boolean }) {
  const when = stage.scheduled_at ? new Date(stage.scheduled_at) : null;
  const completed = stage.status === "completed" || (when !== null && when.getTime() < Date.now() && stage.status !== "in_progress");
  const live = stage.status === "in_progress";
  const online = stage.mode === "online";
  const loc = stage.location?.trim();

  return (
    <div className={cn("rounded-lg border bg-card", completed ? "border-border" : "border-primary/30 bg-primary/5", compact ? "p-3" : "p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className={cn("size-4", completed ? "text-muted-foreground" : "text-primary")} />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {completed ? "Completed round" : live ? "Round in progress" : "Upcoming interview / assessment"}
          </span>
        </div>
        <Badge variant={completed ? "secondary" : "default"}>{completed ? "Completed" : live ? "In progress" : "Upcoming"}</Badge>
      </div>
      <p className="mt-2 font-medium">
        {stage.name}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{ROUND_TYPES[stage.round_type] ?? ""}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {when ? (
          <>
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" />{when.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-muted-foreground" />{when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Date to be announced</span>
        )}
        <span className="flex items-center gap-1.5">
          {online ? <Monitor className="size-3.5 text-muted-foreground" /> : <MapPin className="size-3.5 text-muted-foreground" />}
          {online ? "Online" : "Offline"}
        </span>
      </div>
      {loc ? (
        <div className="mt-2 text-sm">
          {isUrl(loc) ? (
            <a href={loc} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all text-primary hover:underline">
              <ExternalLink className="size-3.5 shrink-0" /> {online ? "Join meeting" : "Open location"}
            </a>
          ) : (
            <span className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span><span className="text-muted-foreground">{online ? "Meeting info: " : "Venue: "}</span>{loc}</span></span>
          )}
        </div>
      ) : null}
      {stage.description ? (
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{stage.description}</p>
      ) : null}
    </div>
  );
}
