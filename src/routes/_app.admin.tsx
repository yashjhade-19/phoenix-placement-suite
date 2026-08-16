import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { EmptyState, LoadingBlock } from "@/components/common";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role === "student") navigate({ to: "/dashboard", replace: true });
  }, [loading, role, navigate]);

  if (loading) return <LoadingBlock rows={5} />;
  if (role !== "admin") {
    return (
      <EmptyState
        title="Admin access required"
        description="Enter your placement cell admin code in Settings to unlock this workspace."
      />
    );
  }

  return <Outlet />;
}
