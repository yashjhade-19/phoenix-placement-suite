import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FormField } from "@/lib/types";
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_VALUES,
  FILE_TYPES,
  OPTION_TYPES,
  PROFILE_FIELD_OPTIONS,
  isTypeChangeSafe,
  profileFieldLabel,
  readValidation,
  type FieldType,
} from "@/lib/form-builder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

interface Draft {
  id?: string;
  label: string;
  field_type: FieldType;
  required: boolean;
  placeholder: string;
  help_text: string;
  options: string;
  profile_field: string;
  min: string;
  max: string;
  minLength: string;
  maxLength: string;
  maxSizeMb: string;
  accept: string;
}

function emptyDraft(): Draft {
  return {
    label: "",
    field_type: "short_text",
    required: false,
    placeholder: "",
    help_text: "",
    options: "",
    profile_field: NONE,
    min: "",
    max: "",
    minLength: "",
    maxLength: "",
    maxSizeMb: "",
    accept: "",
  };
}

function toDraft(field: FormField): Draft {
  const rules = readValidation(field);
  return {
    id: field.id,
    label: field.label,
    field_type: field.field_type as FieldType,
    required: field.required,
    placeholder: field.placeholder ?? "",
    help_text: field.help_text ?? "",
    options: (field.options ?? []).join("\n"),
    profile_field: field.profile_field ?? NONE,
    min: rules.min?.toString() ?? "",
    max: rules.max?.toString() ?? "",
    minLength: rules.minLength?.toString() ?? "",
    maxLength: rules.maxLength?.toString() ?? "",
    maxSizeMb: rules.maxSizeMb?.toString() ?? "",
    accept: rules.accept ?? "",
  };
}

function num(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function FormBuilder({
  driveId,
  fields,
  readOnly,
  readOnlyReason,
}: {
  driveId: string;
  fields: FormField[];
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const fieldIds = fields.map((field) => field.id);
  const usageQuery = useQuery({
    queryKey: ["field-usage", driveId, fieldIds.join(",")],
    enabled: fieldIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_responses")
        .select("field_id")
        .in("field_id", fieldIds);
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.field_id] = (counts[row.field_id] ?? 0) + 1;
      return counts;
    },
  });
  const usage = usageQuery.data ?? {};

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin-drive", driveId] });
    queryClient.invalidateQueries({ queryKey: ["drive-fields", driveId] });
  }

  const saveField = useMutation({
    mutationFn: async (value: Draft) => {
      const label = value.label.trim();
      if (label.length < 2) throw new Error("Field label is required");
      if (label.length > 120) throw new Error("Field label is too long");
      const options = OPTION_TYPES.includes(value.field_type)
        ? value.options
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean)
        : [];
      if (OPTION_TYPES.includes(value.field_type) && options.length === 0)
        throw new Error("Add at least one option");

      const validation: Record<string, number | string> = {};
      if (value.field_type === "number") {
        const min = num(value.min);
        const max = num(value.max);
        if (min !== undefined) validation['min'] = min;
        if (max !== undefined) validation['max'] = max;
        if (min !== undefined && max !== undefined && min > max)
          throw new Error("Minimum cannot be greater than maximum");
      } else if (FILE_TYPES.includes(value.field_type)) {
        const size = num(value.maxSizeMb);
        if (size !== undefined) validation['maxSizeMb'] = size;
        if (value.accept.trim()) validation['accept'] = value.accept.trim();
      } else {
        const minLength = num(value.minLength);
        const maxLength = num(value.maxLength);
        if (minLength !== undefined) validation['minLength'] = minLength;
        if (maxLength !== undefined) validation['maxLength'] = maxLength;
      }

      const payload = {
        drive_id: driveId,
        label,
        field_type: value.field_type,
        required: value.required,
        placeholder: value.placeholder.trim() || null,
        help_text: value.help_text.trim() || null,
        options,
        profile_field: value.profile_field === NONE ? null : value.profile_field,
        validation,
      };

      if (value.id) {
        const existing = fields.find((field) => field.id === value.id);
        if (
          existing &&
          (usage[value.id] ?? 0) > 0 &&
          !isTypeChangeSafe(existing.field_type, value.field_type)
        )
          throw new Error(
            "This field already has submitted responses, so its type cannot be changed.",
          );
        const { error } = await supabase.from("form_fields").update(payload).eq("id", value.id);
        if (error) throw new Error(error.message);
      } else {
        const sortOrder =
          fields.reduce((max, field) => Math.max(max, field.sort_order), -1) + 1;
        const { error } = await supabase
          .from("form_fields")
          .insert({ ...payload, sort_order: sortOrder });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Application form saved");
      setOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeField = useMutation({
    mutationFn: async (field: FormField) => {
      if ((usage[field.id] ?? 0) > 0)
        throw new Error(
          "This field cannot be deleted because applications already contain responses for it.",
        );
      const { error } = await supabase.from("form_fields").delete().eq("id", field.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Field deleted");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const target = index + direction;
      const a = fields[index];
      const b = fields[target];
      if (!a || !b) return;
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("form_fields").update({ sort_order: b.sort_order }).eq("id", a.id),
        supabase.from("form_fields").update({ sort_order: a.sort_order }).eq("id", b.id),
      ]);
      if (e1 || e2) throw new Error(e1?.message ?? e2?.message ?? "Could not reorder");
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  function openNew() {
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(field: FormField) {
    setDraft(toDraft(field));
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Application form</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the information students must provide when applying to this drive.
          </p>
        </div>
        <Button onClick={openNew} disabled={!!readOnly}>
          <Plus className="mr-1 size-4" /> Add field
        </Button>
      </div>

      {readOnly ? (
        <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {readOnlyReason ?? "This form is read-only."}
        </p>
      ) : null}

      {fields.length === 0 ? (
        <EmptyState
          title="No fields yet"
          description="Students will only confirm their application. Add fields to collect drive-specific information."
        />
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const used = usage[field.id] ?? 0;
            return (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {FIELD_TYPE_LABELS[field.field_type as FieldType] ?? field.field_type}
                    </Badge>
                    {field.required ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Required
                      </Badge>
                    ) : null}
                    {field.profile_field ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Profile: {profileFieldLabel(field.profile_field)}
                      </Badge>
                    ) : null}
                    {used > 0 ? (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Lock className="size-3" /> {used} response{used === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  {field.options.length > 0 ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Options: {field.options.join(", ")}
                    </p>
                  ) : null}
                  {field.help_text ? (
                    <p className="mt-1 text-xs text-muted-foreground">{field.help_text}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    disabled={index === 0 || !!readOnly || reorder.isPending}
                    onClick={() => reorder.mutate({ index, direction: -1 })}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    disabled={index === fields.length - 1 || !!readOnly || reorder.isPending}
                    onClick={() => reorder.mutate({ index, direction: 1 })}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit field"
                    disabled={!!readOnly}
                    onClick={() => openEdit(field)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete field"
                    disabled={!!readOnly || used > 0}
                    title={
                      used > 0
                        ? "This field cannot be deleted because applications already contain responses for it."
                        : "Delete field"
                    }
                    onClick={() => removeField.mutate(field)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FieldDialog
        open={open}
        draft={draft}
        setDraft={setDraft}
        onOpenChange={setOpen}
        saving={saveField.isPending}
        lockedType={!!draft.id && (usage[draft.id] ?? 0) > 0}
        onSave={() => saveField.mutate(draft)}
      />
    </div>
  );
}

function FieldDialog({
  open,
  onOpenChange,
  draft,
  setDraft,
  onSave,
  saving,
  lockedType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Draft;
  setDraft: (updater: (prev: Draft) => Draft) => void;
  onSave: () => void;
  saving: boolean;
  lockedType: boolean;
}) {
  // Keep label/type in sync when a profile field is picked for a brand-new field.
  useEffect(() => {
    if (draft.profile_field === NONE || draft.id) return;
    const option = PROFILE_FIELD_OPTIONS.find((item) => item.key === draft.profile_field);
    if (!option) return;
    setDraft((prev) => ({
      ...prev,
      label: prev.label.trim() === "" ? option.label : prev.label,
      field_type: option.type,
    }));
  }, [draft.profile_field, draft.id, setDraft]);

  const isOptionType = OPTION_TYPES.includes(draft.field_type);
  const isFileType = FILE_TYPES.includes(draft.field_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Edit field" : "Add field"}</DialogTitle>
          <DialogDescription>
            Configure how this question appears on the student application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Field label</Label>
            <Input
              value={draft.label}
              placeholder="GitHub profile"
              onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Field type</Label>
              <Select
                value={draft.field_type}
                disabled={lockedType}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, field_type: value as FieldType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {FIELD_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lockedType ? (
                <p className="text-xs text-muted-foreground">
                  Type is locked — responses already exist for this field.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Prefill from profile</Label>
              <Select
                value={draft.profile_field}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, profile_field: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Custom question</SelectItem>
                  {PROFILE_FIELD_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key as string}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">
                Students cannot submit without answering.
              </p>
            </div>
            <Switch
              checked={draft.required}
              onCheckedChange={(required) => setDraft((prev) => ({ ...prev, required }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={draft.placeholder}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, placeholder: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Help text</Label>
              <Input
                value={draft.help_text}
                onChange={(e) => setDraft((prev) => ({ ...prev, help_text: e.target.value }))}
              />
            </div>
          </div>

          {isOptionType ? (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea
                rows={4}
                value={draft.options}
                placeholder={"Bangalore\nHyderabad\nPune"}
                onChange={(e) => setDraft((prev) => ({ ...prev, options: e.target.value }))}
              />
            </div>
          ) : null}

          {draft.field_type === "number" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Minimum value</Label>
                <Input
                  value={draft.min}
                  onChange={(e) => setDraft((prev) => ({ ...prev, min: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum value</Label>
                <Input
                  value={draft.max}
                  onChange={(e) => setDraft((prev) => ({ ...prev, max: e.target.value }))}
                />
              </div>
            </div>
          ) : isFileType ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Max size (MB)</Label>
                <Input
                  value={draft.maxSizeMb}
                  placeholder="5"
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, maxSizeMb: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Accepted types</Label>
                <Input
                  value={draft.accept}
                  placeholder=".pdf,.doc,.docx"
                  onChange={(e) => setDraft((prev) => ({ ...prev, accept: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Min length</Label>
                <Input
                  value={draft.minLength}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, minLength: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max length</Label>
                <Input
                  value={draft.maxLength}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, maxLength: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            Save field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
