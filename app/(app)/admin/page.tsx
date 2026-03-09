import {
  updateAccessMethodSettingsAction,
  updateEmailSettingsAction,
  updateStreamingProviderAction,
  updateTmdbSettingsAction,
} from "@/features/system/actions";
import { SwitchField } from "@/components/forms/switch-field";
import { AccessMethodCard } from "@/components/system/access-method-card";
import {
  StreamingProviderNotes,
  StreamingProviderStatus,
} from "@/components/streaming/provider-status";
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
  const providerCatalog = new Map(
    adminState.streaming.providers.map((provider) => [provider.key, provider] as const),
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">System admin</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">System settings</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Configure TMDB access, email delivery defaults and streaming providers from one
          place. If a field is left empty here, movieshare falls back to the server
          environment when possible.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
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
            <CardTitle>Media runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Config source</span>
              <SourceBadge source={adminState.storage.source} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Bucket</span>
              <span className="font-medium text-foreground">
                {adminState.storage.bucket || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Public base URL</span>
              <span className="font-medium text-foreground">
                {adminState.storage.publicBaseUrl || "Not configured"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Access and providers</CardTitle>
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
            <div className="flex items-center justify-between gap-3">
              <span>Live access methods</span>
              <span className="font-medium text-foreground">
                {
                  adminState.accessMethods.filter((method) => method.availability === "live")
                    .length
                }
              </span>
            </div>
            <p className="pt-2">
              The current watch flow is tracking-first: it records session starts, members
              and checkpoints. It does not imply synced tele-sharing.
            </p>
            <p>
              Additional streaming providers can be introduced over time without binding
              the rest of the product to a single adapter.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
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
                <div className="mt-7">
                  <SwitchField
                    name="smtpSecure"
                    label="Use secure SMTP"
                    description="Recommended for port 465 and production SMTP relays."
                    defaultChecked={adminState.config.smtpSecure}
                  />
                </div>
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
                  placeholder="movieshare <noreply@example.com>"
                />
              </div>
              <Button type="submit" className="w-full">
                Save email settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Access methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Store rollout intent for additional access methods here. Only email and
              password is live today and remains read-only here; the toggles below keep the admin plan and
              prerequisites visible until their runtime wiring lands.
            </p>
            <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Email and password</p>
              <p className="mt-1">
                This method is the current production access flow. It stays on until a
                different live auth path is actually wired at bootstrap time.
              </p>
            </div>
            <form action={updateAccessMethodSettingsAction} className="grid gap-4">
              <SwitchField
                name="authEmailCodeEnabled"
                label="Email code"
                description="Plan a one-time-code flow for low-friction sign-in."
                defaultChecked={adminState.config.authEmailCodeEnabled}
              />
              <SwitchField
                name="authMagicLinkEnabled"
                label="Magic link"
                description="Plan passwordless access through emailed links."
                defaultChecked={adminState.config.authMagicLinkEnabled}
              />
              <SwitchField
                name="authPasskeyEnabled"
                label="Passkeys"
                description="Plan WebAuthn/passkey support for modern devices."
                defaultChecked={adminState.config.authPasskeyEnabled}
              />
              <SwitchField
                name="authTwoFactorEnabled"
                label="Two-factor auth"
                description="Plan an extra verification step for sensitive accounts."
                defaultChecked={adminState.config.authTwoFactorEnabled}
              />
              <Button type="submit" className="w-full">
                Save access method plan
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Access roadmap</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Keep future authentication work visible from the admin panel. These cards
            separate what is already live from what is only configured or still blocked by
            prerequisites such as SMTP or HTTPS.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {adminState.accessMethods.map((method) => (
            <AccessMethodCard key={method.key} method={method} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Streaming providers</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Manage the available streaming adapters. Each slot can be enabled or disabled
            and marked as preferred, with only one ready provider active at a time.
            Playback availability depends on the adapter runtime and deployment
            configuration, and remains separate from watch-session tracking.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {adminState.streaming.configs.map((config) => {
            const provider = providerCatalog.get(config.provider);
            const runtimeCopy = provider?.isReady
              ? "This provider can be selected as the active playback adapter for new watch sessions."
              : "This provider is visible in the catalog, but it still needs provider-specific runtime configuration before it can become active.";

            return (
              <Card key={config.id} className="border-border/70 bg-card/85">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{config.label}</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Provider key: {config.provider}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{config.isEnabled ? "Enabled" : "Disabled"}</Badge>
                    {config.isActive ? <Badge>Active</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StreamingProviderStatus provider={provider} />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {config.notes ||
                      provider?.description ||
                      "Provider slot configurable from the admin catalog without coupling the core domain to one source."}
                  </p>
                  <StreamingProviderNotes provider={provider} />
                  <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    {runtimeCopy}
                  </div>
                  <form action={updateStreamingProviderAction} className="space-y-4">
                    <input type="hidden" name="provider" value={config.provider} />
                    <SwitchField
                      name="isEnabled"
                      label="Enable this provider slot"
                      description="Keep the adapter visible in the catalog without activating playback."
                      defaultChecked={config.isEnabled}
                    />
                    <SwitchField
                      name="isActive"
                      label="Mark as preferred provider"
                      description={
                        provider?.isReady
                          ? "Only one ready provider can be active at a time."
                          : "Not-integrated adapters cannot become the active playback source."
                      }
                      defaultChecked={config.isActive}
                      disabled={!provider?.isReady}
                    />
                    <Button type="submit" className="w-full">
                      Save provider settings
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
