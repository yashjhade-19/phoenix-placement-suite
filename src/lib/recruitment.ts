export const ROUND_TYPES: Record<string, string> = {
  resume_shortlisting: "Resume Shortlisting",
  aptitude_test: "Aptitude Test",
  technical_test: "Technical Test",
  coding_assessment: "Coding Assessment",
  group_discussion: "Group Discussion",
  technical_interview: "Technical Interview",
  hr_interview: "HR Interview",
  presentation: "Presentation",
  other: "Other",
};

export const ROUND_STATUSES: Record<string, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
};

export const ROUND_RESULTS: Record<string, string> = {
  pending: "Pending",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  absent: "Absent",
};

export type RoundResult = keyof typeof ROUND_RESULTS;

export interface Stage {
  id: string;
  drive_id: string;
  name: string;
  sort_order: number;
  round_type: string;
  description: string | null;
  scheduled_at: string | null;
  mode: string;
  location: string | null;
  status: string;
}

export interface RoundResultRow {
  id: string;
  application_id: string;
  stage_id: string;
  result: string;
}

export type TrackerStep = {
  key: string;
  label: string;
  state: "done" | "current" | "failed" | "todo";
  hint?: string;
};

/** Builds a student-facing progress timeline for an application. */
export function buildTracker(
  app: { status: string; current_stage_id: string | null },
  stages: Stage[],
  results: RoundResultRow[],
): TrackerStep[] {
  const ordered = stages.slice().sort((a, b) => a.sort_order - b.sort_order);
  const byStage = new Map(results.map((r) => [r.stage_id, r.result]));
  const currentIdx = ordered.findIndex((s) => s.id === app.current_stage_id);
  const inRounds = currentIdx >= 0 || results.length > 0;
  const shortlisted = inRounds || app.status === "shortlisted" || app.status === "selected";
  const ended = app.status === "rejected" || app.status === "withdrawn";

  const steps: TrackerStep[] = [
    { key: "applied", label: "Applied", state: "done" },
    {
      key: "shortlisted",
      label: "Shortlisted",
      state: shortlisted ? "done" : ended ? "failed" : "current",
    },
  ];

  let failedSeen = !shortlisted && ended;
  ordered.forEach((stage, idx) => {
    const res = byStage.get(stage.id);
    let state: TrackerStep["state"] = "todo";
    if (failedSeen) state = "todo";
    else if (res === "not_qualified" || res === "absent") {
      state = "failed";
      failedSeen = true;
    } else if (idx === currentIdx) state = app.status === "selected" ? "done" : ended ? "failed" : "current";
    else if (res === "qualified" || (currentIdx >= 0 && idx < currentIdx) || app.status === "selected")
      state = "done";
    if (state === "failed") failedSeen = true;
    steps.push({
      key: stage.id,
      label: stage.name,
      state,
      hint: res === "absent" ? "Absent" : res === "not_qualified" ? "Not qualified" : undefined,
    });
  });

  steps.push({
    key: "final",
    label: app.status === "rejected" ? "Rejected" : app.status === "withdrawn" ? "Withdrawn" : "Selected",
    state: app.status === "selected" ? "done" : ended ? "failed" : "todo",
  });
  return steps;
}
