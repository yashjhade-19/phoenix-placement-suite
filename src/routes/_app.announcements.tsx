import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { announcementMatchesStudent, listAnnouncements, listApplications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/domain";

export const Route = createFileRoute("/_app/announcements")({
  component: StudentAnnouncements,
});

function StudentAnnouncements() {
  const { student } = useAuth();

  const announcementsQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: listAnnouncements,
  });
  const appsQuery = useQuery({
    queryKey: ["applications", "me", student?.id],
    queryFn: () => listApplications({ studentId: student?.id }),
    enabled: !!student?.id,
  });

  if (announcementsQuery.isLoading) return <LoadingBlock rows={4} />;

  const appliedDriveIds = (appsQuery.data ?? []).map((a) => a.drive_id);
  const visible = (announcementsQuery.data ?? []).filter((announcement) =>
    announcementMatchesStudent(announcement, student, appliedDriveIds),
  );

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Notices from your placement cell, filtered to what applies to you."
      />

      {visible.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="You'll see placement notices here as soon as they're published."
          icon={<Megaphone className="size-6" />}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-base font-semibold">{announcement.title}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {announcement.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(announcement.publish_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {announcement.content}
                </p>
                {announcement.drive?.title ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Related drive: {announcement.drive.title}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
