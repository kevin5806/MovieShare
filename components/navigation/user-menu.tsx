"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, LogOut, Moon, Shield, Sun, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn, initialsFromName } from "@/lib/utils";

type UserMenuProps = {
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

export function UserMenu({ name, email, role, image }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    const result = await authClient.signOut();

    if (result.error) {
      toast.error(result.error.message ?? "Unable to sign out.");
      return;
    }

    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar className="size-10 border border-border/70 bg-card shadow-sm">
          {image ? <AvatarImage src={image} alt={name} /> : null}
          <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
        </Avatar>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(92vw,380px)] p-0">
        <SheetHeader className="border-b border-border/70 px-5 py-5">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-5">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Account
            </p>
            <p className="mt-2 text-sm text-foreground">Role: {role}</p>
          </div>

          <nav className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 size-4" />
              ) : (
                <Moon className="mr-2 size-4" />
              )}
              {theme === "dark" ? "Tema chiaro" : "Tema scuro"}
            </Button>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
            >
              <UserCircle2 className="mr-2 size-4" />
              Profile
            </Link>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
            >
              <Bell className="mr-2 size-4" />
              Notifications
            </Link>
            {role === "ADMIN" ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
              >
                <Shield className="mr-2 size-4" />
                System admin
              </Link>
            ) : null}
          </nav>

          <Button type="button" variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
