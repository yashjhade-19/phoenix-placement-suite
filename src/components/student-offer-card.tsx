import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field } from "@/components/common";
import { OfferStatusBadge, openOfferDocument } from "@/components/offer-manager";
import { formatCurrency, formatDate } from "@/lib/domain";
import type { OfferWithRelations } from "@/lib/offers";

export function StudentOfferCard({ offer }: { offer: OfferWithRelations }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<null | boolean>(null);
  const expired = !!offer.expiry_date && offer.expiry_date < new Date().toISOString().slice(0, 10);

  const respond = useMutation({
    mutationFn: async (accept: boolean) => {
      const { error } = await supabase.rpc("respond_offer", { _offer: offer.id, _accept: accept });
      if (error) throw new Error(error.message);
      return accept;
    },
    onSuccess: (accept) => {
      toast.success(accept ? "Offer accepted — you are now marked as Placed" : "Offer declined");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setConfirm(null),
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{offer.company?.name}</p>
            <p className="text-sm text-muted-foreground">{offer.role} · {offer.drive?.title}</p>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-4">
          <Field label="CTC" value={formatCurrency(offer.ctc)} />
          <Field label="Offer date" value={offer.release_date ? formatDate(offer.release_date) : "—"} />
          <Field label="Joining date" value={offer.joining_date ? formatDate(offer.joining_date) : "—"} />
          <Field label="Respond by" value={offer.expiry_date ? formatDate(offer.expiry_date) : "—"} />
        </dl>
        {offer.notes ? <p className="whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm">{offer.notes}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          {offer.document_path ? (
            <Button variant="outline" size="sm" onClick={() => void openOfferDocument(offer.document_path)}>
              <FileText className="mr-1 size-4" /> View offer letter
            </Button>
          ) : null}
          {offer.status === "released" && !expired ? (
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>Decline offer</Button>
              <Button size="sm" onClick={() => setConfirm(true)}>Accept offer</Button>
            </div>
          ) : null}
          {offer.status === "released" && expired ? (
            <p className="ml-auto text-sm text-muted-foreground">This offer has expired. Contact the placement cell.</p>
          ) : null}
          {offer.status === "accepted" ? (
            <p className="ml-auto flex items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" /> Offer accepted · Placement status: Placed
            </p>
          ) : null}
          {offer.status === "declined" ? (
            <p className="ml-auto text-sm text-muted-foreground">Offer declined · Placement status: Unplaced</p>
          ) : null}
        </div>
      </CardContent>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? "Accept this offer?" : "Decline this offer?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm
                ? `You will be marked as Placed at ${offer.company?.name}. Your college policy may stop further applications.`
                : "The placement cell will be informed."}{" "}
              You can't change your response later unless the placement cell reopens the offer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={respond.isPending} onClick={(e) => { e.preventDefault(); respond.mutate(!!confirm); }}>
              {confirm ? "Accept offer" : "Decline offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
