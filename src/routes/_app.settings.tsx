import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Field, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { email, fullName, role, organization, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function claimAdmin() {
    if (!code.trim()) {
      toast.error("Enter your placement cell admin code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_admin", { _code: code.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("That admin code is not valid for your college");
      return;
    }
    toast.success("Admin access granted");
    refresh();
    await queryClient.invalidateQueries();
    navigate({ to: "/admin" });
  }

  async function changePassword() {
    const parsed = z.string().min(6, "Password must be at least 6 characters").safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Password updated");
  }

  return (
    <>
      <PageHeader title="Settings" description="Account, organization and access." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={fullName} />
            <Field label="Email" value={email} />
            <Field label="Role" value={role === "admin" ? "Placement Cell Admin" : "Student"} />
            <Field label="Organization" value={organization?.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Use at least 6 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={changePassword} disabled={busy}>
              Update password
            </Button>
          </CardContent>
        </Card>

        {role !== "admin" ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Placement cell access</CardTitle>
              <CardDescription>
                Staff members can unlock the admin workspace with their college admin code.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full space-y-2 sm:max-w-xs">
                <Label htmlFor="admin-code">Admin code</Label>
                <Input
                  id="admin-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PHOENIX-ADMIN"
                />
              </div>
              <Button onClick={claimAdmin} disabled={busy}>
                Unlock admin access
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
