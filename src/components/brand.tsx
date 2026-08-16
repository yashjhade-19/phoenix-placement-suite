import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold",
        className,
      )}
      aria-hidden
    >
      HP
    </div>
  );
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">HirePhoenix</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
