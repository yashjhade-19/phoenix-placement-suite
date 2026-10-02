import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IMPORT_COLUMNS, SAMPLE_CSV, validateImport, type ImportRow } from "@/lib/student-import";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";

type Step = "upload" | "preview" | "summary";
type Summary = { imported: number; skipped: number; errors: number; failures: string[] };

export function StudentImportDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: Student[];
}) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);

  function reset() {
    setStep("upload");
    setRows([]);
    setFileName("");
    setSummary(null);
    setShowErrorsOnly(false);
  }

  function close(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) setTimeout(reset, 200);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hirephoenix-student-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("CSV must be under 5 MB");
      return;
    }
    const text = await file.text();
    const result = validateImport(text, existing);
    if (result.missingColumns.length) {
      toast.error(`Missing columns: ${result.missingColumns.join(", ")}`);
      return;
    }
    if (result.rows.length === 0) {
      toast.error("The file has no student rows");
      return;
    }
    if (result.rows.length > 5000) {
      toast.error("Import up to 5,000 students at a time");
      return;
    }
    setFileName(file.name);
    setRows(result.rows);
    setStep("preview");
  }

  const valid = rows.filter((r) => r.record);
  const duplicates = rows.filter((r) => !r.record && r.duplicate);
  const invalid = rows.filter((r) => !r.record && !r.duplicate);

  async function confirmImport() {
    if (!organization?.id || valid.length === 0) return;
    setBusy(true);
    let imported = 0;
    const failures: string[] = [];
    for (let i = 0; i < valid.length; i += 200) {
      const chunk = valid.slice(i, i + 200);
      const { error, data } = await supabase
        .from("students")
        .insert(
          chunk.map((r) => ({
            ...r.record!,
            org_id: organization.id,
            academic_verification_status: "pending_verification",
          })),
        )
        .select("id");
      if (error) {
        failures.push(`Rows ${chunk[0]!.line}–${chunk[chunk.length - 1]!.line}: ${error.message}`);
      } else imported += data?.length ?? 0;
    }
    setBusy(false);
    setSummary({
      imported,
      skipped: duplicates.length,
      errors: invalid.length + (valid.length - imported),
      failures,
    });
    setStep("summary");
    queryClient.invalidateQueries({ queryKey: ["students"] });
    if (imported > 0) toast.success(`${imported} students imported successfully.`);
  }

  const visible = showErrorsOnly ? rows.filter((r) => !r.record) : rows;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Upload a CSV of your student cohort. Imported records start as Pending Verification."
              : step === "preview"
                ? `Review ${fileName} before importing. Rows with problems will not be imported.`
                : "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="space-y-4">
            <label
              htmlFor="student-csv"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/50"
            >
              <FileUp className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">Choose a CSV file</span>
              <span className="text-xs text-muted-foreground">Up to 5,000 rows · 5 MB</span>
              <input
                id="student-csv"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleFile(file);
                }}
              />
            </label>
            <div className="rounded-md border p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Columns</p>
                <Button variant="outline" size="sm" onClick={downloadSample}>
                  <Download className="mr-1.5 size-4" /> Sample CSV
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {IMPORT_COLUMNS.map((c) => (
                  <Badge key={c.key} variant={c.required ? "secondary" : "outline"}>
                    {c.header}
                    {c.required ? "" : " (optional)"}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                First row must be the header. Students with an existing enrollment number or email are skipped,
                never overwritten.
              </p>
            </div>
          </div>
        ) : null}

        {step === "preview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Total rows" value={rows.length} />
              <Stat label="Valid" value={valid.length} tone="text-success" />
              <Stat label="Duplicates (skipped)" value={duplicates.length} />
              <Stat label="Rows with errors" value={invalid.length} tone="text-destructive" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min(visible.length, 300)} of {visible.length} rows
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowErrorsOnly((v) => !v)}>
                {showErrorsOnly ? "Show all rows" : "Show problems only"}
              </Button>
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.slice(0, 300).map((r) => (
                    <TableRow
                      key={r.line}
                      className={cn(!r.record && (r.duplicate ? "bg-muted/60" : "bg-destructive/5"))}
                    >
                      <TableCell className="text-muted-foreground">{r.line}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.raw.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.raw.email}</div>
                      </TableCell>
                      <TableCell>{r.raw.enrollment_no || "—"}</TableCell>
                      <TableCell>{r.raw.branch || "—"}</TableCell>
                      <TableCell>{r.raw.cgpa || "—"}</TableCell>
                      <TableCell className="max-w-xs">
                        {r.record ? (
                          <span className="text-sm text-success">Ready</span>
                        ) : (
                          <ul className={cn("text-xs", r.duplicate ? "text-muted-foreground" : "text-destructive")}>
                            {r.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        {step === "summary" && summary ? (
          <div className="space-y-4">
            <p className="text-sm font-medium">{summary.imported} students imported successfully.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Imported" value={summary.imported} tone="text-success" />
              <Stat label="Skipped (already exist)" value={summary.skipped} />
              <Stat label="Errors" value={summary.errors} tone="text-destructive" />
            </div>
            {summary.failures.length ? (
              <ul className="text-xs text-destructive">
                {summary.failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Imported students appear as Pending Verification. They can sign up with the same email to link their
              account.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          {step === "preview" ? (
            <>
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={confirmImport} disabled={busy || valid.length === 0}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Import {valid.length} students
              </Button>
            </>
          ) : (
            <Button variant={step === "summary" ? "default" : "ghost"} onClick={() => close(false)}>
              {step === "summary" ? "Done" : "Cancel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
