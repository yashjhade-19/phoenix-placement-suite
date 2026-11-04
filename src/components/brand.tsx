import logoAsset from "@/assets/hirephoenix.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="HirePhoenix logo"
      className={cn("h-10 w-auto shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-tight">
        <div className="text-[17px] tracking-tight">
          <span className="font-semibold text-foreground">Hire</span>
          <span className="font-bold text-primary">Phoenix</span>
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
