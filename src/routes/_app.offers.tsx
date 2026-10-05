import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listOffers } from "@/lib/offers";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { StudentOfferCard } from "@/components/student-offer-card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title: "My Offers — HirePhoenix" },
      { name: "description", content: "View and respond to your placement offers." },
      { property: "og:title", content: "My Offers — HirePhoenix" },
      { property: "og:description", content: "View and respond to your placement offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyOffers,
});

function MyOffers() {
  const { student } = useAuth();
  const q = useQuery({
    queryKey: ["offers", "me", student?.id],
    queryFn: () => listOffers({ studentId: student!.id }),
    enabled: !!student?.id,
  });
  if (q.isLoading) return <LoadingBlock rows={3} />;
  const offers = q.data ?? [];
  const placed = offers.find((o) => o.status === "accepted");
  return (
    <>
      <PageHeader
        title="My offers"
        description="Offers released to you by the placement cell."
        actions={
          <Badge variant="outline" className={placed ? "bg-success/10 text-success" : ""}>
            Placement status: {placed ? `Placed · ${placed.company?.name}` : "Unplaced"}
          </Badge>
        }
      />
      {offers.length === 0 ? (
        <EmptyState title="No offers yet" description="When you're selected and the placement cell releases an offer, it will appear here." />
      ) : (
        <div className="space-y-4">
          {offers.map((o) => (
            <StudentOfferCard key={o.id} offer={o} />
          ))}
        </div>
      )}
    </>
  );
}
