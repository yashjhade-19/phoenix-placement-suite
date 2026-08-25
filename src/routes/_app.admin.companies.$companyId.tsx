import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { getCompany } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { DriveStatusBadge, EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CompanyFormFields,
  CompanyLogo,
  companyPayload,
  companyToForm,
  validateCompany,
  EMPTY_COMPANY,
  type CompanyFormValues,
} from "@/components/company-form";
import { formatCurrency } from "@/lib/domain";
import type { Drive } from "@/lib/types";

export const Route = createFileRoute("/_app/admin/companies/$companyId")({
  component: CompanyDetails,
});

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {value ? (
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 break-all text-sm font-medium text-primary hover:underline"
            >
              {value}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <p className="break-words text-sm font-medium">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Not provided</p>
        )}
      </div>
    </div>
  );
}

function CompanyDetails() {
  const { companyId } = Route.useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CompanyFormValues>({ ...EMPTY_COMPANY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => getCompany(companyId),
  });

  const drivesQuery = useQuery({
    queryKey: ["company-drives", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drives")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Drive[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const result = validateCompany(form);
      setErrors(result.errors);
      if (!result.ok) throw new Error("Please fix the highlighted fields");
      const { error } = await supabase
        .from("companies")
        .update(companyPayload(form))
        .eq("id", companyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Company updated");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (companyQuery.isLoading) return <LoadingBlock rows={5} />;
  const company = companyQuery.data;
  if (!company) return <EmptyState title="Company not found" />;

  const drives = drivesQuery.data ?? [];

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/admin/companies">
          <ArrowLeft className="mr-1 size-4" /> All companies
        </Link>
      </Button>

      <PageHeader
        title={company.name}
        {...(company.industry ? { description: company.industry } : {})}
        actions={
          <Button
            onClick={() => {
              setForm(companyToForm(company));
              setErrors({});
              setOpen(true);
            }}
          >
            Edit company
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
              <CompanyLogo name={company.name} url={company.logo_url} className="size-20" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {company.industry ? <Badge variant="secondary">{company.industry}</Badge> : null}
                  {company.company_size ? (
                    <Badge variant="outline">
                      <Users className="mr-1 size-3" /> {company.company_size} employees
                    </Badge>
                  ) : null}
                  {company.location ? (
                    <Badge variant="outline">
                      <MapPin className="mr-1 size-3" /> {company.location}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {company.description ?? "No company description added yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.website ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={company.website} target="_blank" rel="noreferrer">
                        <Globe className="mr-1 size-4" /> Website
                      </a>
                    </Button>
                  ) : null}
                  {company.linkedin_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={company.linkedin_url} target="_blank" rel="noreferrer">
                        <Linkedin className="mr-1 size-4" /> LinkedIn
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Placement drives</CardTitle>
              <Badge variant="secondary">{drives.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {drivesQuery.isLoading ? (
                <LoadingBlock rows={3} />
              ) : drives.length === 0 ? (
                <EmptyState
                  title="No drives yet"
                  description="Create a drive to start hiring with this company."
                  action={
                    <Button size="sm" asChild>
                      <Link to="/admin/drives/new">Create drive</Link>
                    </Button>
                  }
                />
              ) : (
                drives.map((drive) => (
                  <Link
                    key={drive.id}
                    to="/admin/drives/$driveId"
                    params={{ driveId: drive.id }}
                    className="flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{drive.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {drive.location ?? "Location TBD"}
                        {drive.ctc ? ` • ${formatCurrency(drive.ctc)} CTC` : ""}
                      </p>
                    </div>
                    <DriveStatusBadge status={drive.status} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<Building2 className="size-4" />}
                label="HR / recruiter"
                value={company.contact_name}
              />
              <InfoRow
                icon={<Mail className="size-4" />}
                label="Email"
                value={company.contact_email}
                href={company.contact_email ? `mailto:${company.contact_email}` : null}
              />
              <InfoRow
                icon={<Phone className="size-4" />}
                label="Phone"
                value={company.contact_phone}
                href={company.contact_phone ? `tel:${company.contact_phone}` : null}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<Globe className="size-4" />}
                label="Website"
                value={company.website}
                href={company.website}
              />
              <InfoRow
                icon={<Linkedin className="size-4" />}
                label="LinkedIn"
                value={company.linkedin_url}
                href={company.linkedin_url}
              />
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Headquarters"
                value={company.location}
              />
              <InfoRow
                icon={<Users className="size-4" />}
                label="Company size"
                value={company.company_size ? `${company.company_size} employees` : null}
              />
              <InfoRow
                icon={<Briefcase className="size-4" />}
                label="Industry"
                value={company.industry}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit company</DialogTitle>
          </DialogHeader>
          <CompanyFormFields form={form} setForm={setForm} errors={errors} />
          <DialogFooter>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
