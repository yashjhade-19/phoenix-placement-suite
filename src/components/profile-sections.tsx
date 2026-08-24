import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ExternalLink,
  FolderGit2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { EmptyState } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/domain";

export type ProjectRow = Tables<"student_projects">;
export type CertificationRow = Tables<"student_certifications">;

export function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------------- Skills chips ---------------- */

export function SkillsEditor({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...skills];
    for (const part of parts) {
      if (part.length > 40) continue;
      if (next.some((s) => s.toLowerCase() === part.toLowerCase())) continue;
      next.push(part);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="Type a skill and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && draft === "" && skills.length > 0) {
              onChange(skills.slice(0, -1));
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No skills added yet — add the tools and languages you know.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                className="rounded-full p-0.5 hover:bg-foreground/10"
                onClick={() => onChange(skills.filter((s) => s !== skill))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Professional links ---------------- */

export function LinkField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const invalid = value.trim() !== "" && !isValidUrl(value);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!value.trim() || invalid}
          onClick={() => window.open(value.trim(), "_blank", "noopener")}
          aria-label={`Open ${label}`}
        >
          <ExternalLink className="size-4" />
        </Button>
      </div>
      {invalid ? (
        <p className="text-xs text-destructive">Enter a valid URL starting with http:// or https://</p>
      ) : null}
    </div>
  );
}

/* ---------------- Projects ---------------- */

type ProjectDraft = {
  id?: string;
  title: string;
  description: string;
  technologies: string[];
  url: string;
};

const emptyProject: ProjectDraft = { title: "", description: "", technologies: [], url: "" };

export function ProjectsSection({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft>(emptyProject);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["student-projects", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_projects")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as ProjectRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: ProjectDraft) => {
      if (input.title.trim().length < 2) throw new Error("Project title is required");
      if (!isValidUrl(input.url)) throw new Error("Enter a valid project URL");
      const payload = {
        student_id: studentId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        technologies: input.technologies,
        url: input.url.trim() || null,
      };
      const { error } = input.id
        ? await supabase.from("student_projects").update(payload).eq("id", input.id)
        : await supabase.from("student_projects").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Project saved");
      setOpen(false);
      setDraft(emptyProject);
      queryClient.invalidateQueries({ queryKey: ["student-projects", studentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_projects").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["student-projects", studentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openNew() {
    setDraft(emptyProject);
    setOpen(true);
  }

  function openEdit(project: ProjectRow) {
    setDraft({
      id: project.id,
      title: project.title,
      description: project.description ?? "",
      technologies: project.technologies ?? [],
      url: project.url ?? "",
    });
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Projects</CardTitle>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="mr-1.5 size-4" /> Add project
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="size-6" />}
            title="No projects added"
            description="Showcase what you have built — recruiters look at this first."
            action={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 size-4" /> Add project
              </Button>
            }
          />
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{project.title}</p>
                  {project.description ? (
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  {project.url ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open project"
                      onClick={() => window.open(project.url as string, "_blank", "noopener")}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit project"
                    onClick={() => openEdit(project)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete project"
                    onClick={() => remove.mutate(project.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {(project.technologies ?? []).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((tech) => (
                    <Badge key={tech} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit project" : "Add project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={draft.title}
                placeholder="Campus placement portal"
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                placeholder="What it does and your role in it"
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Technologies / skills</Label>
              <SkillsEditor
                skills={draft.technologies}
                onChange={(technologies) => setDraft((p) => ({ ...p, technologies }))}
              />
            </div>
            <LinkField
              label="Project URL (optional)"
              placeholder="https://github.com/you/project"
              value={draft.url}
              onChange={(url) => setDraft((p) => ({ ...p, url }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------------- Certifications ---------------- */

type CertDraft = {
  id?: string;
  name: string;
  issuer: string;
  credential_url: string;
  issue_date: string;
};

const emptyCert: CertDraft = { name: "", issuer: "", credential_url: "", issue_date: "" };

export function CertificationsSection({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CertDraft>(emptyCert);

  const { data: certifications = [], isLoading } = useQuery({
    queryKey: ["student-certifications", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_certifications")
        .select("*")
        .eq("student_id", studentId)
        .order("issue_date", { ascending: false, nullsFirst: false });
      if (error) throw new Error(error.message);
      return data as CertificationRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: CertDraft) => {
      if (input.name.trim().length < 2) throw new Error("Certification name is required");
      if (!isValidUrl(input.credential_url)) throw new Error("Enter a valid credential URL");
      const payload = {
        student_id: studentId,
        name: input.name.trim(),
        issuer: input.issuer.trim() || null,
        credential_url: input.credential_url.trim() || null,
        issue_date: input.issue_date || null,
      };
      const { error } = input.id
        ? await supabase.from("student_certifications").update(payload).eq("id", input.id)
        : await supabase.from("student_certifications").insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Certification saved");
      setOpen(false);
      setDraft(emptyCert);
      queryClient.invalidateQueries({ queryKey: ["student-certifications", studentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_certifications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Certification deleted");
      queryClient.invalidateQueries({ queryKey: ["student-certifications", studentId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openNew() {
    setDraft(emptyCert);
    setOpen(true);
  }

  function openEdit(cert: CertificationRow) {
    setDraft({
      id: cert.id,
      name: cert.name,
      issuer: cert.issuer ?? "",
      credential_url: cert.credential_url ?? "",
      issue_date: cert.issue_date ?? "",
    });
    setOpen(true);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Certifications</CardTitle>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="mr-1.5 size-4" /> Add certification
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : certifications.length === 0 ? (
          <EmptyState
            icon={<Award className="size-6" />}
            title="No certifications added"
            description="Add courses and credentials you have earned."
            action={
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 size-4" /> Add certification
              </Button>
            }
          />
        ) : (
          certifications.map((cert) => (
            <div key={cert.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.issuer || "Unknown issuer"}
                  {cert.issue_date ? ` · ${formatDate(cert.issue_date)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {cert.credential_url ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open credential"
                    onClick={() => window.open(cert.credential_url as string, "_blank", "noopener")}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit certification"
                  onClick={() => openEdit(cert)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete certification"
                  onClick={() => remove.mutate(cert.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit certification" : "Add certification"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={draft.name}
                placeholder="AWS Certified Cloud Practitioner"
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Issuing organization</Label>
              <Input
                value={draft.issuer}
                placeholder="Amazon Web Services"
                onChange={(e) => setDraft((p) => ({ ...p, issuer: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Issue date</Label>
              <Input
                type="date"
                value={draft.issue_date}
                onChange={(e) => setDraft((p) => ({ ...p, issue_date: e.target.value }))}
              />
            </div>
            <LinkField
              label="Credential URL (optional)"
              placeholder="https://credly.com/badges/..."
              value={draft.credential_url}
              onChange={(credential_url) => setDraft((p) => ({ ...p, credential_url }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save certification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
