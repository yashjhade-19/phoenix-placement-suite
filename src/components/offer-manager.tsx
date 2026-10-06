import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/common";
import { formatDate } from "@/lib/domain";
import { listOffers, OFFER_STATUS_CLASS, OFFER_STATUS_LABELS, OUTCOMES, type Offer } from "@/lib/offers";
import { cn } from "@/lib/utils";

type App = {
  id: string;
  status: string;
  student_id: string;
  drive_id: string;
  drive: { title: string; ctc: number | null; company_id: string; company: { name: string } | null } | null;
};

export function OfferStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", OFFER_STATUS_CLASS[status])}>
      {OFFER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/** Placement cell records the outcome communicated by the company/student. No offer documents or terms. */
export function OfferManager({ application }: { application: App }) {
  const [open, setOpen] = useState(false);
  const offerQuery = useQuery({
    queryKey: ["offer", application.id],
    queryFn: async () => (await listOffers({ applicationId: application.id }))[0] ?? null,
  });
  const offer = offerQuery.data;
  const isSelected = application.status === "selected";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="size-4" /> Placement outcome
        </CardTitle>
        {offer ? <OfferStatusBadge status={offer.status} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {offer ? (
          <>
            <Field label="Recorded on" value={offer.release_date ? formatDate(offer.release_date) : "—"} />
            {offer.notes ? <Field label="Notes" value={offer.notes} /> : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isSelected
              ? "Record the outcome the company or student has communicated to the placement cell."
              : "An outcome can be recorded once the applicant is marked Selected."}
          </p>
        )}
        <Button className="w-full" variant={offer ? "outline" : "default"} disabled={!isSelected} onClick={() => setOpen(true)}>
          {offer ? "Update outcome" : "Record outcome"}
        </Button>
      </CardContent>
      {open ? <OutcomeDialog onClose={() => setOpen(false)} application={application} offer={offer ?? null} /> : null}
    </Card>
  );
}

function OutcomeDialog({ onClose, application, offer }: { onClose: () => void; application: App; offer: Offer | null }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const valid = OUTCOMES.some(([k]) => k === offer?.status);
  const [status, setStatus] = useState<string>(valid ? offer!.status : "released");
  const [date, setDate] = useState(offer?.release_date ?? today);
  const [notes, setNotes] = useState(offer?.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        application_id: application.id,
        student_id: application.student_id,
        drive_id: application.drive_id,
        company_id: application.drive!.company_id,
        org_id: "00000000-0000-0000-0000-000000000000", // set by DB trigger from the application
        role: offer?.role ?? application.drive?.title ?? "—",
        release_date: date || today,
        notes: notes.trim() || null,
        status,
      };
      const { error } = offer
        ? await supabase.from("offers").update(row).eq("id", offer.id)
        : await supabase.from("offers").insert(row);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Placement outcome recorded");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record placement outcome</DialogTitle>
          <DialogDescription>
            {application.drive?.company?.name} · {application.drive?.title}. Offer letters and terms are handled by the company.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Outcome</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date communicated</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea rows={3} placeholder="e.g. Confirmed by company HR email" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>Save outcome</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
