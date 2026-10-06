import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Offer = Tables<"offers">;
export type PlacementPolicy = Tables<"placement_policies">;
export type OfferWithRelations = Offer & {
  company: { name: string; logo_url: string | null } | null;
  drive: { title: string } | null;
};

/** Placement outcomes recorded by the placement cell (from company/student communication). */
export const OUTCOMES = [
  ["released", "Offer Received"],
  ["accepted", "Offer Accepted"],
  ["declined", "Offer Declined"],
  ["placed", "Placed"],
] as const;

export const OFFER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft (legacy)",
  released: "Offer Received",
  accepted: "Offer Accepted",
  declined: "Offer Declined",
  placed: "Placed",
  revoked: "Revoked (legacy)",
};

export const OFFER_STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  released: "bg-warning/15 text-warning",
  accepted: "bg-primary/10 text-primary",
  declined: "bg-destructive/10 text-destructive",
  placed: "bg-success/10 text-success",
  revoked: "bg-muted text-muted-foreground line-through",
};

/** Has an offer received/accepted but not yet placed. */
export const HAS_OFFER = ["released", "accepted"];

export const DEFAULT_POLICY = {
  allow_after_selection: true,
  allow_with_pending_offer: true,
  allow_after_placed: false,
  allow_upgrades: false,
  upgrade_min_ctc: null as number | null,
  use_tiers: false,
};

export const TIERS = [
  ["regular", "Regular"],
  ["dream", "Dream"],
  ["super_dream", "Super Dream"],
] as const;

const SELECT = "*, company:companies(name, logo_url), drive:drives(title)";

export async function listOffers(filter?: { studentId?: string; applicationId?: string }) {
  let q = supabase.from("offers").select(SELECT).order("created_at", { ascending: false });
  if (filter?.studentId) q = q.eq("student_id", filter.studentId);
  if (filter?.applicationId) q = q.eq("application_id", filter.applicationId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OfferWithRelations[];
}

export async function getPolicy(orgId: string) {
  const { data, error } = await supabase.from("placement_policies").select("*").eq("org_id", orgId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { org_id: orgId, ...DEFAULT_POLICY, updated_at: "" };
}

export async function getBlockReason(studentId: string, driveId: string) {
  const { data, error } = await supabase.rpc("application_block_reason", { _student: studentId, _drive: driveId });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/** Placement map: studentId -> outcome recorded as Placed */
export function placementMap(offers: OfferWithRelations[]) {
  const m = new Map<string, OfferWithRelations>();
  offers.forEach((o) => o.status === "placed" && m.set(o.student_id, o));
  return m;
}

/** Client-side mirror of the DB rule, used to flag applicants in admin pools. */
export function policyBlockForApplication(
  app: { student_id: string; drive_id: string; status: string },
  offers: OfferWithRelations[],
  selectedByStudent: Map<string, string[]>,
  p: Pick<PlacementPolicy, "allow_after_placed" | "allow_with_pending_offer" | "allow_after_selection">,
) {
  if (app.status === "selected") return null;
  const mine = offers.filter((o) => o.student_id === app.student_id && o.drive_id !== app.drive_id);
  const placed = mine.find((o) => o.status === "placed");
  if (!p.allow_after_placed && placed) return `Placed at ${placed.company?.name ?? "another company"} — policy restricts further applications`;
  if (!p.allow_with_pending_offer && mine.some((o) => HAS_OFFER.includes(o.status))) return "Has received an offer — policy restricts further applications";
  if (!p.allow_after_selection && (selectedByStudent.get(app.student_id) ?? []).some((d) => d !== app.drive_id))
    return "Selected in another drive — policy restricts further applications";
  return null;
}
