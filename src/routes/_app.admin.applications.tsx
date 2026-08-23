import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/domain";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/_app/admin/applications")({
  component: AdminApplications,
});

const APP_STATUSES = [
  "applied",
  "under_review",
  "shortlisted",
  "selected",
  "rejected",
  "withdrawn",
] as const;
type AppStatus = (typeof APP_STATUSES)[number];

function AdminApplications() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const term = useDebounce(search);

  const query = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, student:students(full_name, enrollment_no, branch, email), drive:drives(title, company:companies(name))",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: AppStatus }) => {
      const { error } = await supabase.from("applications").update({ status: next }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Application updated");
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingBlock rows={6} />;

  const rows = (query.data ?? []).filter((row) => {
    const q = term.trim().toLowerCase();
    if (status !== "all" && row.status !== status) return false;
    if (
      q &&
      !`${row.student?.full_name ?? ""} ${row.student?.enrollment_no ?? ""} ${row.drive?.title ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Applications"
        description="Review and progress candidates across every drive."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          className="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student or drive"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {APP_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No applications match your filters" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="w-44">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.student?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.student?.enrollment_no} • {row.student?.branch ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.drive?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.drive?.company?.name}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onValueChange={(next) =>
                        update.mutate({ id: row.id, next: next as AppStatus })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/admin/applications/$applicationId"
                        params={{ applicationId: row.id }}
                      >
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
