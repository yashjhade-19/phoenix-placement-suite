import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listApplications, listDrives } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { evaluateEligibility, isBatchEligible } from "@/lib/eligibility";
import {
  DriveStatusBadge,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
} from "@/components/common";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_TYPES, WORK_MODES, formatCurrency, formatDate, daysLeft } from "@/lib/domain";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/_app/drives/")({
  component: StudentDrives,
});

function StudentDrives() {
  const { student } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const debounced = useDebounce(search);

  const drivesQuery = useQuery({ queryKey: ["drives"], queryFn: listDrives });
  const rulesQuery = useQuery({
    queryKey: ["all-rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eligibility_rules").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const appsQuery = useQuery({
    queryKey: ["applications", "me", student?.id],
    queryFn: () => listApplications({ studentId: student?.id }),
    enabled: !!student?.id,
  });

  if (drivesQuery.isLoading) return <LoadingBlock rows={6} />;
  if (drivesQuery.isError) return <ErrorBlock message={(drivesQuery.error as Error).message} />;

  const appliedIds = new Set((appsQuery.data ?? []).map((a) => a.drive_id));

  const visible = (drivesQuery.data ?? [])
    .filter((drive) => drive.status !== "draft")
    .map((drive) => {
      const rules = (rulesQuery.data ?? []).filter((r) => r.drive_id === drive.id);
      const eligible =
        isBatchEligible(student, drive.eligible_batches) &&
        evaluateEligibility(student, rules).eligible;
      return { drive, eligible, applied: appliedIds.has(drive.id) };
    })
    .filter(({ drive, eligible, applied }) => {
      const term = debounced.trim().toLowerCase();
      if (
        term &&
        !`${drive.title} ${drive.company?.name ?? ""} ${drive.location ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (filter === "eligible") return eligible;
      if (filter === "open") return drive.status === "applications_open";
      if (filter === "applied") return applied;
      return true;
    });

  return (
    <>
      <PageHeader
        title="Placement drives"
        description="Every opportunity published by your placement cell."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, company or location"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All drives</SelectItem>
            <SelectItem value="open">Applications open</SelectItem>
            <SelectItem value="eligible">Eligible for me</SelectItem>
            <SelectItem value="applied">Already applied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No drives match your filters"
          description="Try a different search term or filter."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ drive, eligible, applied }) => {
            const left = daysLeft(drive.deadline);
            return (
              <Card key={drive.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{drive.title}</h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {drive.company?.name}
                      </p>
                    </div>
                    <DriveStatusBadge status={drive.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{formatCurrency(drive.ctc)}</Badge>
                    <Badge variant="secondary">
                      {EMPLOYMENT_TYPES[drive.employment_type] ?? drive.employment_type}
                    </Badge>
                    <Badge variant="secondary">
                      {WORK_MODES[drive.work_mode] ?? drive.work_mode}
                    </Badge>
                    <Badge variant="secondary">{drive.location ?? "Location TBA"}</Badge>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {drive.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      Deadline {formatDate(drive.deadline)}
                      {left !== null && left >= 0 ? ` • ${left} days left` : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      {applied ? (
                        <Badge className="bg-success/10 text-success" variant="outline">
                          Applied
                        </Badge>
                      ) : eligible ? (
                        <Badge className="bg-success/10 text-success" variant="outline">
                          Eligible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive">
                          Not eligible
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/drives/$driveId" params={{ driveId: drive.id }}>
                          View details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
