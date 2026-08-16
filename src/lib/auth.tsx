import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Organization, Student } from "./types";

export type Role = "admin" | "student";

interface AccountData {
  role: Role | null;
  fullName: string | null;
  email: string | null;
  organization: Organization | null;
  student: Student | null;
}

interface AuthValue extends AccountData {
  userId: string | null;
  loading: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthValue>({
  role: null,
  fullName: null,
  email: null,
  organization: null,
  student: null,
  userId: null,
  loading: true,
  refresh: () => {},
});

export async function fetchAccount(userId: string): Promise<AccountData> {
  const [profileRes, rolesRes, studentRes] = await Promise.all([
    supabase.from("profiles").select("*, organizations(*)").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("students").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role);
  const profile = profileRes.data as
    | ({ full_name: string | null; email: string | null; organizations: Organization | null })
    | null;

  return {
    role: roles.includes("admin") ? "admin" : roles.includes("student") ? "student" : null,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
    organization: profile?.organizations ?? null,
    student: (studentRes.data as Student | null) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      queryClient.invalidateQueries({ queryKey: ["account"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["account", userId],
    queryFn: () => fetchAccount(userId as string),
    enabled: !!userId,
  });

  const value: AuthValue = {
    userId,
    role: data?.role ?? null,
    fullName: data?.fullName ?? null,
    email: data?.email ?? session?.user.email ?? null,
    organization: data?.organization ?? null,
    student: data?.student ?? null,
    loading: !ready || (!!userId && isLoading),
    refresh: () => queryClient.invalidateQueries({ queryKey: ["account"] }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
