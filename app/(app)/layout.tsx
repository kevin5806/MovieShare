import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell
      user={{
        name: session.user.name || "MovieList User",
        email: session.user.email,
        role: session.user.role ?? "USER",
      }}
    >
      {children}
    </AppShell>
  );
}
