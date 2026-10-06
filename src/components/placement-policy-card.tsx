import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_POLICY, getPolicy } from "@/lib/offers";

const ROWS = [
  ["allow_after_selection", "Applications after selection", "Can a student who is selected in a drive keep applying to other drives?"],
  ["allow_with_pending_offer", "Applications with a pending offer", "Can a student who has an offer awaiting response keep applying?"],
  ["allow_after_placed", "Applications after an accepted offer", "Can a placed student (offer accepted) apply to further drives?"],
] as const;

export function PlacementPolicyCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["placement-policy", orgId], queryFn: () => getPolicy(orgId) });
  const [p, setP] = useState({ ...DEFAULT_POLICY });
  useEffect(() => {
    if (q.data) setP({ ...DEFAULT_POLICY, ...q.data, upgrade_min_ctc: q.data.upgrade_min_ctc });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("placement_policies").upsert({ org_id: orgId, ...p });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Placement policy saved");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Placement policies</CardTitle>
        <CardDescription>Decide when students may keep applying. HirePhoenix enforces these rules when students apply and in applicant lists.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {ROWS.map(([key, title, help]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-4 first:pt-0">
            <div>
              <Label htmlFor={key} className="font-medium">{title}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{help}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-right text-sm text-muted-foreground">{p[key] ? "Allowed" : "Not allowed"}</span>
              <Switch id={key} checked={p[key]} onCheckedChange={(v) => setP({ ...p, [key]: v })} />
            </div>
          </div>
        ))}
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="upg" className="font-medium">Placement upgrades</Label>
              <p className="mt-1 text-xs text-muted-foreground">Record your college's upgrade rule (e.g. Dream / Super Dream drives). Saved for reference; upgrade calculations aren't applied yet.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-right text-sm text-muted-foreground">{p.allow_upgrades ? "Enabled" : "Disabled"}</span>
              <Switch id="upg" checked={p.allow_upgrades} onCheckedChange={(v) => setP({ ...p, allow_upgrades: v })} />
            </div>
          </div>
          {p.allow_upgrades ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Minimum CTC for an upgrade (₹)</Label>
                <Input inputMode="decimal" value={p.upgrade_min_ctc ?? ""} onChange={(e) => setP({ ...p, upgrade_min_ctc: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Use drive classes</p>
                  <p className="text-xs text-muted-foreground">Regular, Dream, Super Dream</p>
                </div>
                <Switch checked={p.use_tiers} onCheckedChange={(v) => setP({ ...p, use_tiers: v })} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end pt-4">
          <Button disabled={save.isPending || q.isLoading} onClick={() => save.mutate()}>Save policies</Button>
        </div>
      </CardContent>
    </Card>
  );
}
