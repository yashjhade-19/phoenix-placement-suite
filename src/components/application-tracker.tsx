import { Check, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackerStep } from "@/lib/recruitment";

export function ApplicationTracker({ steps }: { steps: TrackerStep[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
              step.state === "done" && "border-success/30 bg-success/10 text-success",
              step.state === "current" && "border-primary bg-primary/10 font-medium text-primary",
              step.state === "failed" && "border-destructive/30 bg-destructive/10 text-destructive",
              step.state === "todo" && "text-muted-foreground",
            )}
          >
            {step.state === "done" ? (
              <Check className="size-3" />
            ) : step.state === "failed" ? (
              <X className="size-3" />
            ) : (
              <Circle className={cn("size-2.5", step.state === "current" && "fill-current")} />
            )}
            {step.label}
            {step.hint ? <span className="opacity-80">· {step.hint}</span> : null}
          </span>
          {i < steps.length - 1 ? <span className="h-px w-3 bg-border" /> : null}
        </li>
      ))}
    </ol>
  );
}
