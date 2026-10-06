import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OfferStatusBadge } from "@/components/offer-manager";
import { formatDate } from "@/lib/domain";
import type { OfferWithRelations } from "@/lib/offers";

/** Read-only placement outcome recorded by the placement cell. */
export function StudentOfferCard({ offer }: { offer: OfferWithRelations }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{offer.company?.name}</p>
            <p className="text-sm text-muted-foreground">{offer.drive?.title}</p>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Recorded by the placement cell{offer.release_date ? ` on ${formatDate(offer.release_date)}` : ""}.
        </p>
        {offer.notes ? <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">{offer.notes}</p> : null}
        {offer.status === "placed" ? (
          <p className="flex items-center gap-1 text-sm font-medium text-success">
            <CheckCircle2 className="size-4" /> Placement status: Placed
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
