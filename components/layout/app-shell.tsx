"use client";

import Link from "next/link";
import { Bell, LayoutDashboard, ListChecks, Radio, Settings2, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/navigation/user-menu";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
    image?: string | null;
  };
  notificationCount: number;
  versionLabel: string;
};

function SidebarContent({
  items,
  versionLabel,
}: {
  items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;
  versionLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-5 p-5">
        <BrandMark />
        <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Realtime-ready
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            Lists, invites, watch sessions and notifications share the same modular
            shell.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">TMDB</Badge>
            <Badge variant="secondary">Better Auth</Badge>
            <Badge variant="secondary">Postgres</Badge>
          </div>
        </div>
        <SidebarNav items={items} />
      </div>
      <div className="mt-auto p-5">
        <div className="space-y-3 rounded-3xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
          <p>Notifications now have a dedicated inbox. Presence and richer live sync still need work.</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
            {versionLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, user, notificationCount, versionLabel }: AppShellProps) {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  if (user.role === "ADMIN") {
    items.push({ href: "/admin", label: "System", icon: Settings2 });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.45),_transparent_32%),linear-gradient(180deg,_rgba(248,250,252,0.92),_rgba(248,250,252,1))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 md:px-6 lg:flex-row lg:gap-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[32px] border border-border/70 bg-sidebar/85 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
          <ScrollArea className="h-[calc(100vh-2rem)]">
            <SidebarContent items={items} versionLabel={versionLabel} />
          </ScrollArea>
        </aside>

        <div className="flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col rounded-[28px] border border-border/70 bg-background/90 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:rounded-[32px] lg:min-h-[calc(100vh-2rem)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger
                  className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "lg:hidden")}
                >
                  <ListChecks className="size-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(88vw,320px)] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>Application navigation</SheetDescription>
                  </SheetHeader>
                  <SidebarContent items={items} versionLabel={versionLabel} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Workspace
                </p>
                <h1 className="truncate text-sm font-semibold sm:text-base">
                  Shared movie planning
                </h1>
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
                <Radio className="size-4" />
                <span>Live refresh on</span>
              </div>
              <InstallPrompt />
              <Link
                href="/notifications"
                aria-label="Open notifications"
                className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "relative")}
              >
                <Bell className="size-4" />
                {notificationCount ? (
                  <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
              </Link>
              <Separator orientation="vertical" className="hidden h-8 sm:block" />
              <UserMenu
                name={user.name}
                email={user.email}
                role={user.role}
                image={user.image}
              />
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
