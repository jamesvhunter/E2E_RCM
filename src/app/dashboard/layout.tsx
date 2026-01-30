import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  FileText,
  Users,
  Stethoscope,
  Receipt,
  DollarSign,
  AlertCircle,
  Settings,
  Building2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: FileText },
  { href: "/dashboard/appointments", label: "Schedules", icon: CalendarDays },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/encounters", label: "Encounters", icon: Stethoscope },
  { href: "/dashboard/claims", label: "Claims", icon: Receipt },
  { href: "/dashboard/ledger", label: "Ledger", icon: DollarSign },
  { href: "/dashboard/operations", label: "Work Queue", icon: AlertCircle, badge: "3" },
];

const settingsItems: NavItem[] = [
  { href: "/dashboard/practice", label: "Practice Setup", icon: Building2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/freed-logo.svg"
              alt="Freed RCM"
              width={160}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}

          <Separator className="my-4" />

          {settingsItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* User & Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium text-sidebar-accent-foreground">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <SignOutButton />
          <div className="text-xs text-sidebar-foreground/60 pt-2">
            <p>Freed RCM v0.1.0</p>
            <p className="mt-1">Phase 1: Patient Intake</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-muted-foreground">
              AI-Native Practice Management
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              Prototype
            </Badge>
            <Button size="sm" variant="ghost">
              Help
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  
  return (
    <Link href={item.href}>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {item.badge}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
