import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { listCompanies } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Company } from "@/lib/types";

export const Route = createFileRoute("/_app/admin/companies")({
  component: AdminCompanies,
});

const schema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  industry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  website: z.string().trim().max(200).optional(),
  contact_name: z.string().trim().max(120).optional(),
  contact_email: z.string().trim().max(255).optional(),
  contact_phone: z.string().trim().max(30).optional(),
  description: z.string().trim().max(2000).optional(),
});

const EMPTY = {
  name: "",
  industry: "",
  location: "",
  website: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  description: "",
};

function AdminCompanies() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: listCompanies });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const payload = {
        name: form.name.trim(),
        industry: form.industry || null,
        location: form.location || null,
        website: form.website || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        description: form.description || null,
      };
      if (editing) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        if (!organization) throw new Error("Missing organization");
        const { error } = await supabase
          .from("companies")
          .insert({ ...payload, org_id: organization.id });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Company updated" : "Company added");
      setOpen(false);
      setEditing(null);
      setForm({ ...EMPTY });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Company removed");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: () => toast.error("Remove the company's drives first, then try again."),
  });

  if (companiesQuery.isLoading) return <LoadingBlock rows={5} />;
  const companies = companiesQuery.data ?? [];

  function startEdit(company: Company) {
    setEditing(company);
    setForm({
      name: company.name,
      industry: company.industry ?? "",
      location: company.location ?? "",
      website: company.website ?? "",
      contact_name: company.contact_name ?? "",
      contact_email: company.contact_email ?? "",
      contact_phone: company.contact_phone ?? "",
      description: company.description ?? "",
    });
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Companies"
        description="Recruiters registered with your placement cell."
        actions={
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setEditing(null);
                setForm({ ...EMPTY });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Add company</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit company" : "Add company"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Company name"],
                    ["industry", "Industry"],
                    ["location", "Headquarters"],
                    ["website", "Website"],
                    ["contact_name", "Contact person"],
                    ["contact_email", "Contact email"],
                    ["contact_phone", "Contact phone"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">About</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {editing ? "Save changes" : "Add company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {companies.length === 0 ? (
        <EmptyState title="No companies yet" description="Add your first recruiter to begin." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.industry ?? "—"}</TableCell>
                  <TableCell>{company.location ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company.contact_name ?? "—"}
                    {company.contact_email ? ` • ${company.contact_email}` : ""}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(company)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => remove.mutate(company.id)}
                    >
                      Delete
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
