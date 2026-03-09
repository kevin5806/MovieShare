import { Bell, LayoutDashboard, ListChecks, Radio, Settings2, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/navigation/user-menu";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
  };
};

function SidebarContent({
  items,
}: {
  items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;
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
            Lists, feedback, watch sessions and provider config share the same modular
            domain.
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
        <div className="rounded-3xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
          Notifications and realtime presence are planned for the next iterations.
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, user }: AppShellProps) {
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  if (user.role === "ADMIN") {
    items.push({ href: "/admin/streaming", label: "System", icon: Settings2 });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.45),_transparent_32%),linear-gradient(180deg,_rgba(248,250,252,0.92),_rgba(248,250,252,1))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 md:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[32px] border border-border/70 bg-sidebar/85 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur md:block">
          <ScrollArea className="h-[calc(100vh-2rem)]">
            <SidebarContent items={items} />
          </ScrollArea>
        </aside>

        <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-[32px] border border-border/70 bg-background/90 shadow-[0_22px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <header className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger
                  className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "md:hidden")}
                >
                  <ListChecks className="size-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>Application navigation</SheetDescription>
                  </SheetHeader>
                  <SidebarContent items={items} />
                </SheetContent>
              </Sheet>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Workspace
                </p>
                <h1 className="text-base font-semibold">Shared movie planning</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon-sm">
                <Radio className="size-4" />
              </Button>
              <Button variant="outline" size="icon-sm">
                <Bell className="size-4" />
              </Button>
              <Separator orientation="vertical" className="hidden h-8 md:block" />
              <UserMenu name={user.name} email={user.email} role={user.role} />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
