import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_app/admin/announcements")({
  component: AdminAnnouncements,
});

const schema = z.object({
  title: z.string().trim().min(3, "Title is required").max(140),
  content: z.string().trim().min(3, "Message is required").max(2000),
});

function AdminAnnouncements() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", content: "" });

  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      if (!organization) throw new Error("Missing organization");
      const { error } = await supabase.from("announcements").insert({
        org_id: organization.id,
        title: parsed.data.title,
        content: parsed.data.content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Announcement published");
      setForm({ title: "", content: "" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader title="Announcements" description="Broadcast updates to students on campus." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Pre-placement talk scheduled"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            />
          </div>
          <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
            Publish
          </Button>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <LoadingBlock rows={4} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <div className="space-y-3">
          {(query.data ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="font-medium">{item.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(item.id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
