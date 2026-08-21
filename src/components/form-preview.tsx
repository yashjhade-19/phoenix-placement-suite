import { useState } from "react";
import type { FormField, Student } from "@/lib/types";
import { DynamicFormField, type FormResponses } from "@/components/dynamic-form";
import { Button } from "@/components/ui/button";
import { buildInitialResponses } from "@/lib/form-builder";

/** Read-only rendering of exactly what students will see for this drive. */
export function FormPreview({
  title,
  fields,
  student,
}: {
  title: string;
  fields: FormField[];
  student?: Student | null;
}) {
  const [responses, setResponses] = useState<FormResponses>(() =>
    buildInitialResponses(fields, student),
  );

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Preview only — nothing entered here is submitted.
      </p>
      <div className="mt-5 space-y-5">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No fields configured yet. Students will only confirm their application.
          </p>
        ) : (
          fields.map((field) => (
            <DynamicFormField
              key={field.id}
              field={field}
              value={responses[field.id]}
              fromProfile={!!field.profile_field}
              onChange={(value) => setResponses((prev) => ({ ...prev, [field.id]: value }))}
            />
          ))
        )}
        <Button type="button" disabled>
          Submit application
        </Button>
      </div>
    </div>
  );
}
