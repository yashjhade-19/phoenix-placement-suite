import { CheckCircle2, XCircle } from "lucide-react";
import type { EligibilityResult } from "@/lib/eligibility";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function EligibilityPanel({
  result,
  batchOk,
  batches,
}: {
  result: EligibilityResult;
  batchOk: boolean;
  batches: number[];
}) {
  const eligible = result.eligible && batchOk;

  return (
    <div className="space-y-4">
      <Alert
        className={cn(
          eligible
            ? "border-success/30 bg-success/5"
            : "border-destructive/30 bg-destructive/5",
        )}
      >
        <AlertTitle className="flex items-center gap-2">
          {eligible ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          {eligible ? "You are eligible for this drive" : "You are not eligible yet"}
        </AlertTitle>
        <AlertDescription>
          {eligible
            ? "All eligibility criteria set by the placement cell are met."
            : "Update your profile or check the unmet criteria listed below."}
        </AlertDescription>
      </Alert>

      {!batchOk ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <span className="font-medium">Batch restriction:</span> this drive is open to the{" "}
          {batches.join(", ")} graduating batch{batches.length > 1 ? "es" : ""} only.
        </div>
      ) : null}

      {result.hasRules ? (
        <div className="space-y-3">
          {result.groups.map((group) => (
            <div key={group.groupIndex} className="rounded-md border p-3">
              {group.checks.length > 1 ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Any one of the following
                </p>
              ) : null}
              <ul className="space-y-2">
                {group.checks.map((check) => (
                  <li key={check.rule.id} className="flex items-start gap-2 text-sm">
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <span>
                      {check.requirement}
                      <span className="ml-1 text-muted-foreground">
                        (yours: {check.actual})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No academic eligibility criteria configured for this drive.
        </p>
      )}
    </div>
  );
}
