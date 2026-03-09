"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | null;
};

export type SidebarNavSection = {
  title: string;
  items: SidebarNavItem[];
};

export function SidebarNav({ sections }: { sections: SidebarNavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.title} className="space-y-2">
          {sectionIndex > 0 ? <Separator className="mb-4" /> : null}
          <p className="px-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge ? (
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="rounded-full px-2 py-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
