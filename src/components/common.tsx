import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABELS,
  DRIVE_STATUS_LABELS,
} from "@/lib/domain";
import type { ApplicationStatus, DriveStatus } from "@/lib/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-md bg-accent p-2 text-accent-foreground">{icon}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message ?? "Something went wrong while loading this data."}
    </div>
  );
}

const driveTone: Record<DriveStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  published: "bg-info/10 text-info border-info/20",
  applications_open: "bg-success/10 text-success border-success/25",
  applications_closed: "bg-warning/15 text-warning-foreground border-warning/30",
  selection_in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-secondary text-secondary-foreground border-transparent",
};

export function DriveStatusBadge({ status }: { status: DriveStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", driveTone[status])}>
      {DRIVE_STATUS_LABELS[status]}
    </Badge>
  );
}

const appTone: Record<ApplicationStatus, string> = {
  applied: "bg-secondary text-secondary-foreground border-transparent",
  under_review: "bg-info/10 text-info border-info/20",
  shortlisted: "bg-primary/10 text-primary border-primary/20",
  selected: "bg-success/10 text-success border-success/25",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn: "bg-muted text-muted-foreground border-transparent",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", appTone[status])}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value ?? "—"}</dd>
    </div>
  );
}
