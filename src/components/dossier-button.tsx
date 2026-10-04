import { useState } from "react";
import { FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadDossier } from "@/lib/export";

export function DossierButton({ ids, title, label = "Download dossier" }: { ids: string[]; title: string; label?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async () => {
    if (!ids.length) return toast.info("No candidates to include");
    setBusy("Preparing…");
    try {
      const r = await downloadDossier(ids, title, (d, t) => setBusy(`Packaging ${d}/${t}…`));
      toast.success(`Dossier ready: ${r.total} candidates, ${r.resumes} resumes`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Button size="sm" variant="outline" disabled={!!busy} onClick={run}>
      <FileArchive className="mr-1 size-4" /> {busy ?? label}
    </Button>
  );
}
