import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { organization, email } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Institute configuration and your admin account." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Institute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input readOnly value={organization?.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Admin invite code</Label>
              <div className="flex gap-2">
                <Input readOnly value={organization?.admin_code ?? ""} />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(organization?.admin_code ?? "");
                    toast.success("Invite code copied");
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this with placement staff so they can upgrade their account to admin.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input readOnly value={email ?? ""} />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the account menu in the sidebar to sign out.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
