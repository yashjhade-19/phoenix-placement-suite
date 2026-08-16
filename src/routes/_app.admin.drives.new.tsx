import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { listCompanies } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/drives/new")({
  component: NewDrive,
});

const schema = z.object({
  title: z.string().trim().min(2, "Role title is required").max(120),
  company_id: z.string().uuid("Select a company"),
});

function NewDrive() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: listCompanies });

  const [form, setForm] = useState({
    title: "",
    company_id: "",
    description: "",
    location: "",
    ctc: "",
    stipend: "",
    employment_type: "full_time",
    work_mode: "onsite",
    eligible_batches: String(new Date().getFullYear() + 1),
    opens_at: "",
    deadline: "",
    drive_date: "",
    benefits: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      if (!organization) throw new Error("Missing organization");
      const { data, error } = await supabase
        .from("drives")
        .insert({
          org_id: organization.id,
          company_id: form.company_id,
          title: form.title.trim(),
          description: form.description || null,
          location: form.location || null,
          ctc: form.ctc ? Number(form.ctc) : null,
          stipend: form.stipend ? Number(form.stipend) : null,
          employment_type: form.employment_type,
          work_mode: form.work_mode,
          eligible_batches: form.eligible_batches
            .split(",")
            .map((y) => Number(y.trim()))
            .filter((y) => !Number.isNaN(y)),
          opens_at: form.opens_at || null,
          deadline: form.deadline || null,
          drive_date: form.drive_date || null,
          benefits: form.benefits || null,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Drive created as draft");
      queryClient.invalidateQueries({ queryKey: ["drives"] });
      navigate({ to: "/admin/drives/$driveId", params: { driveId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function set(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
        <Link to="/admin/drives">
          <ArrowLeft className="mr-1 size-4" /> All drives
        </Link>
      </Button>
      <PageHeader
        title="Create placement drive"
        description="Save as a draft, then add eligibility rules, form fields and rounds."
      />

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Role title</Label>
            <Input value={form.title} onChange={set("title")} placeholder="Software Engineer" />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={form.company_id}
              onValueChange={(company_id) => setForm((p) => ({ ...p, company_id }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {(companiesQuery.data ?? []).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CTC (annual, ₹)</Label>
            <Input value={form.ctc} onChange={set("ctc")} placeholder="1200000" />
          </div>
          <div className="space-y-2">
            <Label>Stipend (monthly, ₹)</Label>
            <Input value={form.stipend} onChange={set("stipend")} />
          </div>
          <div className="space-y-2">
            <Label>Employment type</Label>
            <Select
              value={form.employment_type}
              onValueChange={(employment_type) => setForm((p) => ({ ...p, employment_type }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Work mode</Label>
            <Select
              value={form.work_mode}
              onValueChange={(work_mode) => setForm((p) => ({ ...p, work_mode }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WORK_MODES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={set("location")} />
          </div>
          <div className="space-y-2">
            <Label>Eligible batches (comma separated)</Label>
            <Input value={form.eligible_batches} onChange={set("eligible_batches")} />
          </div>
          <div className="space-y-2">
            <Label>Applications open</Label>
            <Input type="datetime-local" value={form.opens_at} onChange={set("opens_at")} />
          </div>
          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input type="datetime-local" value={form.deadline} onChange={set("deadline")} />
          </div>
          <div className="space-y-2">
            <Label>Drive date</Label>
            <Input type="date" value={form.drive_date} onChange={set("drive_date")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Role description</Label>
            <Textarea rows={4} value={form.description} onChange={set("description")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Benefits</Label>
            <Textarea rows={3} value={form.benefits} onChange={set("benefits")} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Create drive
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
