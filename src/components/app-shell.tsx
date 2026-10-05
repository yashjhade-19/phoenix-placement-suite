import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Briefcase,
  FileText,
  Gift,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PieChart,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Wordmark } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Students", to: "/admin/students", icon: Users },
  { label: "Companies", to: "/admin/companies", icon: Building2 },
  { label: "Placement Drives", to: "/admin/drives", icon: Briefcase },
  { label: "Applications", to: "/admin/applications", icon: FileText },
  { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
  { label: "Reports", to: "/admin/reports", icon: PieChart },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Profile", to: "/profile", icon: User },
  { label: "Placement Drives", to: "/drives", icon: Briefcase },
  { label: "My Applications", to: "/applications", icon: FileText },
  { label: "My Offers", to: "/offers", icon: Gift },
  { label: "Announcements", to: "/announcements", icon: Megaphone },
  { label: "Settings", to: "/settings", icon: Settings },
];

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.to ||
          (item.to !== "/admin" && item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  unreadAnnouncements = 0,
}: {
  children: ReactNode;
  unreadAnnouncements?: number;
}) {
  const { role, fullName, email, organization } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const items = role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const initials = (fullName ?? email ?? "U")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Wordmark subtitle={role === "admin" ? "Placement Cell" : "Student"} />
      <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
      <div className="mt-auto rounded-md border bg-muted/40 p-3">
        <p className="text-xs font-medium">{organization?.name ?? "Organization"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          AY {organization?.academic_year ?? "—"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar lg:block">
        {sidebar}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Wordmark />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link to={role === "admin" ? "/admin/announcements" : "/announcements"}>
              <Button variant="ghost" size="icon" className="relative" aria-label="Announcements">
                <Bell className="size-4" />
                {unreadAnnouncements > 0 ? (
                  <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
                    {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                  </Badge>
                ) : null}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate text-sm sm:inline">
                    {fullName ?? email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-medium">{fullName ?? "Account"}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{email}</div>
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {role === "admin" ? "Placement Cell Admin" : "Student"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={role === "admin" ? "/admin/settings" : "/settings"}>
                    <Settings className="mr-2 size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                {role === "student" ? (
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <GraduationCap className="mr-2 size-4" /> My Profile
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <div className="flex items-center gap-3 px-2 py-2 text-sm">
                  {theme === "dark" ? (
                    <Moon className="size-4 text-muted-foreground" />
                  ) : (
                    <Sun className="size-4 text-muted-foreground" />
                  )}
                  <label htmlFor="theme-toggle" className="flex-1 cursor-pointer">
                    Dark mode
                  </label>
                  <Switch
                    id="theme-toggle"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    aria-label="Toggle dark mode"
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
