import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCompanies } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
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
import {
  CompanyFormFields,
  CompanyLogo,
  EMPTY_COMPANY,
  companyPayload,
  companyToForm,
  validateCompany,
  type CompanyFormValues,
} from "@/components/company-form";
import type { Company } from "@/lib/types";

export const Route = createFileRoute("/_app/admin/companies/")({
  component: AdminCompanies,
});

function AdminCompanies() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormValues>({ ...EMPTY_COMPANY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: listCompanies });

  const save = useMutation({
    mutationFn: async () => {
      const result = validateCompany(form);
      setErrors(result.errors);
      if (!result.ok) throw new Error("Please fix the highlighted fields");
      const payload = companyPayload(form);
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
      setForm({ ...EMPTY_COMPANY });
      setErrors({});
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
    setForm(companyToForm(company));
    setErrors({});
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
                setForm({ ...EMPTY_COMPANY });
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Add company</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit company" : "Add company"}</DialogTitle>
              </DialogHeader>
              <CompanyFormFields form={form} setForm={setForm} errors={errors} />
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
                <TableHead>Size</TableHead>
                <TableHead>HR contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CompanyLogo
                        name={company.name}
                        url={company.logo_url}
                        className="size-9"
                      />
                      <Link
                        to="/admin/companies/$companyId"
                        params={{ companyId: company.id }}
                        className="font-medium hover:underline"
                      >
                        {company.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{company.industry ?? "—"}</TableCell>
                  <TableCell>{company.location ?? "—"}</TableCell>
                  <TableCell>{company.company_size ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {company.contact_name ?? "—"}
                    {company.contact_email ? ` • ${company.contact_email}` : ""}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/admin/companies/$companyId"
                        params={{ companyId: company.id }}
                      >
                        View
                      </Link>
                    </Button>
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
