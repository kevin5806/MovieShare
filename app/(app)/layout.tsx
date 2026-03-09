import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/session";
import { getApplicationVersion } from "@/server/version";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const appVersion = await getApplicationVersion();

  return (
    <AppShell
      user={{
        name: session.user.name || "movielist user",
        email: session.user.email,
        role: session.user.role ?? "USER",
      }}
      versionLabel={appVersion.label}
    >
      {children}
    </AppShell>
  );
}
