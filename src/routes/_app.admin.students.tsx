import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACADEMIC_STATUSES,
  AcademicStatusBadge,
  StudentAcademicDialog,
} from "@/components/academic-verification";
import { StudentImportDialog } from "@/components/student-import-dialog";
import { listApplications, listStudents } from "@/lib/api";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { BRANCHES } from "@/lib/domain";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/_app/admin/students")({
  component: AdminStudents,
});

function AdminStudents() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [academic, setAcademic] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounced = useDebounce(search);

  const studentsQuery = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const appsQuery = useQuery({ queryKey: ["applications"], queryFn: () => listApplications() });

  if (studentsQuery.isLoading) return <LoadingBlock rows={6} />;

  const placedIds = new Set(
    (appsQuery.data ?? []).filter((a) => a.status === "selected").map((a) => a.student_id),
  );

  const students = (studentsQuery.data ?? []).filter((student) => {
    const term = debounced.trim().toLowerCase();
    if (
      term &&
      !`${student.full_name} ${student.email} ${student.enrollment_no}`.toLowerCase().includes(term)
    )
      return false;
    if (branch !== "all" && student.branch !== branch) return false;
    if (academic !== "all" && student.academic_verification_status !== academic) return false;
    return true;
  });
  const all = studentsQuery.data ?? [];
  const selected = all.find((s) => s.id === selectedId) ?? null;
  const pendingCount = all.filter((s) => s.academic_verification_status !== "verified").length;

  return (
    <>
      <PageHeader
        title="Students"
        description={`${all.length} students registered • ${placedIds.size} placed • ${pendingCount} awaiting verification`}
        actions={
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 size-4" /> Import Students
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or enrollment number"
          />
        </div>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={academic} onValueChange={setAcademic}>
          <SelectTrigger className="sm:w-56" aria-label="Academic status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All academic statuses</SelectItem>
            {ACADEMIC_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StudentImportDialog open={importOpen} onOpenChange={setImportOpen} existing={all} />
      <StudentAcademicDialog student={selected} onOpenChange={(o) => !o && setSelectedId(null)} />

      {students.length === 0 ? (
        <EmptyState title="No students match your filters" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>CGPA</TableHead>
                <TableHead>Backlogs</TableHead>
                <TableHead>Academic status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.slice(0, 200).map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.full_name}</div>
                    <div className="text-xs text-muted-foreground">{student.email}</div>
                  </TableCell>
                  <TableCell>{student.enrollment_no}</TableCell>
                  <TableCell>{student.branch ?? "—"}</TableCell>
                  <TableCell>{student.graduation_year ?? "—"}</TableCell>
                  <TableCell>{student.cgpa ?? "—"}</TableCell>
                  <TableCell>{student.active_backlogs}</TableCell>
                  <TableCell>
                    <AcademicStatusBadge status={student.academic_verification_status} />
                  </TableCell>
                  <TableCell>
                    {placedIds.has(student.id) ? (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        Placed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Available</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(student.id)}>
                      Review
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
