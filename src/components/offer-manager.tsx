import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/common";
import { signedFileUrl } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/domain";
import { listOffers, OFFER_STATUS_CLASS, OFFER_STATUS_LABELS, type Offer } from "@/lib/offers";
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

export async function openOfferDocument(path: string | null | undefined) {
  const url = await signedFileUrl(path);
  if (!url) toast.error("Could not open the offer document");
  else window.open(url, "_blank", "noopener");
}

export function OfferManager({ application }: { application: App }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const offerQuery = useQuery({
    queryKey: ["offer", application.id],
    queryFn: async () => (await listOffers({ applicationId: application.id }))[0] ?? null,
  });
  const offer = offerQuery.data;
  const isSelected = application.status === "selected";

  const setStatus = useMutation({
    mutationFn: async (patch: Partial<Offer>) => {
      const { error } = await supabase.from("offers").update(patch).eq("id", offer!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Offer updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4" /> Offer
        </CardTitle>
        {offer ? <OfferStatusBadge status={offer.status} /> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!offer ? (
          isSelected ? (
            <>
              <p className="text-sm text-muted-foreground">This applicant is selected. Create an offer to send to the student.</p>
              <Button className="w-full" onClick={() => setOpen(true)}>Create offer</Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Offers can be created once the applicant is marked Selected.</p>
          )
        ) : (
          <>
            <Field label="Role" value={offer.role} />
            <Field label="CTC" value={formatCurrency(offer.ctc)} />
            <Field label="Offer date" value={offer.release_date ? formatDate(offer.release_date) : "—"} />
            <Field label="Joining date" value={offer.joining_date ? formatDate(offer.joining_date) : "—"} />
            <Field label="Respond by" value={offer.expiry_date ? formatDate(offer.expiry_date) : "—"} />
            {offer.responded_at ? <Field label="Student responded" value={formatDateTime(offer.responded_at)} /> : null}
            {offer.notes ? <Field label="Notes" value={offer.notes} /> : null}
            {offer.document_path ? (
              <Button variant="outline" size="sm" className="w-full" onClick={() => void openOfferDocument(offer.document_path)}>
                <FileText className="mr-1 size-4" /> Offer letter
              </Button>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {offer.status === "draft" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Edit</Button>
                  <Button size="sm" disabled={!isSelected || setStatus.isPending} onClick={() => setStatus.mutate({ status: "released" })}>
                    Release offer
                  </Button>
                </>
              ) : null}
              {offer.status === "released" ? (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setStatus.mutate({ status: "revoked" })}>
                  Revoke
                </Button>
              ) : null}
              {offer.status === "accepted" ? (
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => confirm("Revoke this accepted offer? The student will become Unplaced.") && setStatus.mutate({ status: "revoked" })}>
                  Revoke
                </Button>
              ) : null}
              {["accepted", "declined", "revoked"].includes(offer.status) ? (
                <Button size="sm" variant="outline" disabled={!isSelected} onClick={() => setStatus.mutate({ status: "released", responded_at: null })}>
                  Reopen for response
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
      <OfferDialog open={open} onOpenChange={setOpen} application={application} offer={offer ?? null} />
    </Card>
  );
}

function OfferDialog({ open, onOpenChange, application, offer }: { open: boolean; onOpenChange: (o: boolean) => void; application: App; offer: Offer | null }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState(() => ({
    role: offer?.role ?? application.drive?.title ?? "",
    ctc: String(offer?.ctc ?? application.drive?.ctc ?? ""),
    release_date: offer?.release_date ?? today,
    joining_date: offer?.joining_date ?? "",
    expiry_date: offer?.expiry_date ?? "",
    notes: offer?.notes ?? "",
  }));
  const [file, setFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async (release: boolean) => {
      if (!f.role.trim()) throw new Error("Job role is required");
      if (f.ctc && Number.isNaN(Number(f.ctc))) throw new Error("CTC must be a number");
      if (f.expiry_date && f.expiry_date < f.release_date) throw new Error("Expiry date must be after the offer date");
      let document_path = offer?.document_path ?? null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("Offer letter must be under 10 MB");
        document_path = `offers/${application.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("resumes").upload(document_path, file, { upsert: true });
        if (error) throw new Error(error.message);
      }
      const row = {
        application_id: application.id,
        student_id: application.student_id,
        drive_id: application.drive_id,
        company_id: application.drive!.company_id,
        org_id: "00000000-0000-0000-0000-000000000000", // set by DB trigger from the application
        role: f.role.trim(),
        ctc: f.ctc ? Number(f.ctc) : null,
        release_date: f.release_date || null,
        joining_date: f.joining_date || null,
        expiry_date: f.expiry_date || null,
        notes: f.notes.trim() || null,
        document_path,
        status: release ? "released" : "draft",
      };
      const { error } = offer
        ? await supabase.from("offers").update(row).eq("id", offer.id)
        : await supabase.from("offers").insert(row);
      if (error) throw new Error(error.message);
      return release;
    },
    onSuccess: (release) => {
      toast.success(release ? "Offer released to the student" : "Offer saved as draft");
      qc.invalidateQueries();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "Create offer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Company · Drive</Label>
            <Input readOnly value={`${application.drive?.company?.name ?? ""} · ${application.drive?.title ?? ""}`} />
          </div>
          <div className="space-y-1">
            <Label>Job role *</Label>
            <Input value={f.role} onChange={set("role")} />
          </div>
          <div className="space-y-1">
            <Label>CTC (₹ per year)</Label>
            <Input inputMode="decimal" value={f.ctc} onChange={set("ctc")} />
          </div>
          <div className="space-y-1">
            <Label>Offer date</Label>
            <Input type="date" value={f.release_date} onChange={set("release_date")} />
          </div>
          <div className="space-y-1">
            <Label>Joining date</Label>
            <Input type="date" value={f.joining_date} onChange={set("joining_date")} />
          </div>
          <div className="space-y-1">
            <Label>Respond by (expiry)</Label>
            <Input type="date" value={f.expiry_date} onChange={set("expiry_date")} />
          </div>
          <div className="space-y-1">
            <Label>Offer letter (PDF)</Label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Notes for the student</Label>
            <Textarea rows={3} value={f.notes} onChange={set("notes")} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}>Save as draft</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate(true)}>Release offer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
