import { StreamingProviderKey } from "@/generated/prisma/client";
import {
  updateEmailSettingsAction,
  updateStreamingProviderAction,
  updateTmdbSettingsAction,
} from "@/features/system/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminSession } from "@/server/session";
import { getSystemAdminState } from "@/server/services/system-config";
import { getApplicationVersion } from "@/server/version";

function SourceBadge({ source }: { source: "database" | "environment" | "missing" }) {
  if (source === "database") {
    return <Badge>Database</Badge>;
  }

  if (source === "environment") {
    return <Badge variant="secondary">Environment fallback</Badge>;
  }

  return <Badge variant="secondary">Not configured</Badge>;
}

export default async function SystemAdminPage() {
  await requireAdminSession();
  const [adminState, appVersion] = await Promise.all([
    getSystemAdminState(),
    getApplicationVersion(),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">System admin</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">System settings</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Configure TMDB access, email delivery defaults and streaming providers from one
          place. If a field is left empty here, movielist falls back to the server
          environment when possible.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>TMDB runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Credential source</span>
              <SourceBadge source={adminState.tmdb.source} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Auth mode</span>
              <span className="font-medium text-foreground">{adminState.tmdb.authMode}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Language</span>
              <span className="font-medium text-foreground">{adminState.tmdb.language}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Email runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Config source</span>
              <SourceBadge source={adminState.email.source} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>SMTP host</span>
              <span className="font-medium text-foreground">
                {adminState.email.host || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>From</span>
              <span className="font-medium text-foreground">
                {adminState.email.from || "Not configured"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Auth and providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>App version</span>
              <span className="font-medium text-foreground">{appVersion.label}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Better Auth URL</span>
              <span className="font-medium text-foreground">{adminState.authBaseUrl}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Streaming provider</span>
              <span className="font-medium text-foreground">
                {adminState.streaming.activeConfig?.label || "No provider active"}
              </span>
            </div>
            <p className="pt-2">
              The current watch flow is tracking-first: it records session starts, members
              and checkpoints. It does not imply synced tele-sharing.
            </p>
            <p>
              In futuro sara possibile aggiungere ulteriori provider di streaming
              configurabili.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>TMDB integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Prefer the API Read Access Token. If both values are present, the bearer token
              wins over the API key fallback.
            </p>
            <form action={updateTmdbSettingsAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Read Access Token</label>
                <Textarea
                  name="tmdbApiToken"
                  rows={4}
                  defaultValue={adminState.config.tmdbApiToken ?? ""}
                  className="font-mono text-xs"
                  placeholder="Paste the TMDB bearer token"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  name="tmdbApiKey"
                  defaultValue={adminState.config.tmdbApiKey ?? ""}
                  className="font-mono text-xs"
                  placeholder="de1011..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default language</label>
                <Input
                  name="tmdbLanguage"
                  defaultValue={adminState.config.tmdbLanguage}
                  placeholder="en-US"
                />
              </div>
              <Button type="submit" className="w-full">
                Save TMDB settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Email delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              These SMTP settings are stored for future invite emails, notifications and
              digest workflows. Empty values keep the environment fallback active.
            </p>
            <form action={updateEmailSettingsAction} className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP host</label>
                <Input
                  name="smtpHost"
                  defaultValue={adminState.config.smtpHost ?? ""}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Port</label>
                  <Input
                    name="smtpPort"
                    type="number"
                    defaultValue={adminState.config.smtpPort.toString()}
                    placeholder="587"
                  />
                </div>
                <label className="mt-7 flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                  <input type="checkbox" name="smtpSecure" defaultChecked={adminState.config.smtpSecure} />
                  Use secure SMTP
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP user</label>
                <Input
                  name="smtpUser"
                  defaultValue={adminState.config.smtpUser ?? ""}
                  placeholder="mailer@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP password</label>
                <Input
                  name="smtpPassword"
                  type="password"
                  defaultValue={adminState.config.smtpPassword ?? ""}
                  placeholder="App password or SMTP secret"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <Input
                  name="smtpFrom"
                  defaultValue={adminState.config.smtpFrom ?? ""}
                  placeholder="movielist <noreply@example.com>"
                />
              </div>
              <Button type="submit" className="w-full">
                Save email settings
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Streaming providers</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            The current catalog is intentionally small. The active provider can be managed
            here without coupling the main domain to a single implementation. The current
            `vixsrc` slot is only a placeholder and does not generate a working playback URL
            in this build.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {adminState.streaming.configs.map((config) => (
            <Card key={config.id} className="border-border/70 bg-card/85">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{config.label}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Provider key: {StreamingProviderKey.VIXSRC}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{config.isEnabled ? "Enabled" : "Disabled"}</Badge>
                  {config.isActive ? <Badge>Active</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {config.notes ||
                    "Provider slot scaffolded. Adapter can be replaced later without touching the core domain."}
                </p>
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  Enabling this slot only marks it as the preferred provider in the domain.
                  Playback remains unavailable until a deployment-specific adapter is wired.
                </div>
                <form action={updateStreamingProviderAction} className="space-y-4">
                  <input type="hidden" name="provider" value={config.provider} />
                  <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                    <input type="checkbox" name="isEnabled" defaultChecked={config.isEnabled} />
                    Enable this provider slot
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={config.isActive} />
                    Mark as preferred provider
                  </label>
                  <Button type="submit" className="w-full">
                    Save provider settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
