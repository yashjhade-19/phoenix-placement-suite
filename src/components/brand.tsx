import logoAsset from "@/assets/hirephoenix.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5",
        className,
      )}
    >
      <img
        src={logoAsset.url}
        alt="HirePhoenix logo"
        className="h-7 w-auto object-contain"
        draggable={false}
      />
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
