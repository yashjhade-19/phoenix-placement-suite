import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccount } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wordmark } from "@/components/brand";
import { BRANCHES } from "@/lib/domain";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HirePhoenix — Campus Placement Management Platform" },
      {
        name: "description",
        content:
          "HirePhoenix is a multi-college placement management platform for placement cells and students: drives, eligibility, applications and reporting in one place.",
      },
      { property: "og:title", content: "HirePhoenix — Campus Placement Management Platform" },
      {
        property: "og:description",
        content:
          "Run campus recruitment end to end: companies, drives, eligibility rules, dynamic application forms and placement analytics.",
      },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  rollNumber: z.string().trim().min(2, "Enter your roll number").max(40),
  branch: z.string().min(1, "Select your branch"),
  graduationYear: z.coerce.number().int().min(2000).max(2100),
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setChecking(false);
        return;
      }
      const account = await fetchAccount(data.session.user.id);
      navigate({ to: account.role === "admin" ? "/admin" : "/dashboard", replace: true });
    });
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <Wordmark subtitle="Placement Management Platform" />
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Campus recruitment, run like an enterprise.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Manage recruiters, publish placement drives with rule-based eligibility, collect
            structured applications and track every selection round — for any college, on one
            platform.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li>• Automated eligibility engine with CGPA, backlog and branch rules</li>
            <li>• Drive-specific dynamic application forms</li>
            <li>• Stage-wise recruitment pipeline and placement analytics</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Demo organization: Northstar Institute of Technology
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Wordmark subtitle="Placement Management Platform" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Sign in to your placement account or register as a student.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Student sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="signin" className="pt-4">
                  <SignInForm />
                </TabsContent>
                <TabsContent value="signup" className="pt-4">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "Unable to sign in");
      return;
    }
    const account = await fetchAccount(data.user.id);
    toast.success("Signed in");
    navigate({ to: account.role === "admin" ? "/admin" : "/dashboard", replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          placeholder="you@college.edu"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Sign in
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Placement cell staff: sign up, then enter your college admin code in Settings to unlock
        admin access.
      </p>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    rollNumber: "",
    branch: "",
    graduationYear: String(new Date().getFullYear() + 1),
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          roll_number: parsed.data.rollNumber,
          branch: parsed.data.branch,
          graduation_year: parsed.data.graduationYear,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Account created. Check your email to confirm, then sign in.");
      return;
    }
    toast.success("Welcome to HirePhoenix");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          placeholder="Aarav Sharma"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="signup-roll">Roll number</Label>
          <Input
            id="signup-roll"
            value={values.rollNumber}
            onChange={(e) => setValues((v) => ({ ...v, rollNumber: e.target.value }))}
            placeholder="NIT22CS001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-year">Graduation year</Label>
          <Input
            id="signup-year"
            inputMode="numeric"
            value={values.graduationYear}
            onChange={(e) => setValues((v) => ({ ...v, graduationYear: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-branch">Branch</Label>
        <Select
          value={values.branch}
          onValueChange={(branch) => setValues((v) => ({ ...v, branch }))}
        >
          <SelectTrigger id="signup-branch">
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {BRANCHES.map((branch) => (
              <SelectItem key={branch} value={branch}>
                {branch}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          placeholder="you@college.edu"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Create student account
      </Button>
    </form>
  );
}
