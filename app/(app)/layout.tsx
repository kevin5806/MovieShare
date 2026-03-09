import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/server/session";
import { getNotificationSummary } from "@/server/services/notification-service";
import { getApplicationVersion } from "@/server/version";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const [appVersion, notificationSummary] = await Promise.all([
    getApplicationVersion(),
    getNotificationSummary({
      userId: session.user.id,
      email: session.user.email,
    }),
  ]);

  return (
    <AppShell
      user={{
        name: session.user.name || "movieshare user",
        email: session.user.email,
        role: session.user.role ?? "USER",
      }}
      notificationCount={notificationSummary.total}
      versionLabel={appVersion.label}
    >
      {children}
    </AppShell>
  );
}
