import {
  updateAccessMethodSettingsAction,
  updateEmailSettingsAction,
  updatePushDeliverySettingsAction,
  updateStreamingProviderAction,
  updateTmdbSettingsAction,
} from "@/features/system/actions";
import { Field, FieldLabel } from "@/components/forms/field";
import { NotificationPreferenceEditor } from "@/components/notifications/notification-preference-editor";
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
import {
  getPushRuntimeConfig,
  getSystemNotificationPreferences,
} from "@/server/services/notification-preference-service";
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
  const [adminState, appVersion, notificationPreferences, pushRuntime] = await Promise.all([
    getSystemAdminState(),
    getApplicationVersion(),
    getSystemNotificationPreferences(),
    getPushRuntimeConfig(),
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
          Configure catalog access, delivery defaults and streaming providers from one
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
            <div className="flex items-center justify-between gap-3">
              <span>Access config source</span>
              <SourceBadge source={adminState.accessMethodSettings.source} />
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
        <Card className="h-full border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>TMDB integration</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <p className="min-h-[72px] text-sm leading-6 text-muted-foreground">
              Prefer the API Read Access Token. If both values are present, the bearer token
              wins over the API key fallback. `TMDB_LANGUAGE` can also bootstrap the
              default locale outside the panel.
            </p>
            <form action={updateTmdbSettingsAction} className="mt-4 flex flex-1 flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="tmdb-api-token">API Read Access Token</FieldLabel>
                <Textarea
                  id="tmdb-api-token"
                  name="tmdbApiToken"
                  rows={3}
                  defaultValue={adminState.config.tmdbApiToken ?? ""}
                  className="h-24 resize-none font-mono text-xs"
                  placeholder="Paste the TMDB bearer token"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="tmdb-api-key">API Key</FieldLabel>
                  <Input
                    id="tmdb-api-key"
                    name="tmdbApiKey"
                    defaultValue={adminState.config.tmdbApiKey ?? ""}
                    className="font-mono text-xs"
                    placeholder="de1011..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tmdb-language">Default language</FieldLabel>
                  <Input
                    id="tmdb-language"
                    name="tmdbLanguage"
                    defaultValue={adminState.config.tmdbLanguage}
                    placeholder="en-US"
                  />
                </Field>
              </div>
              <Button type="submit" className="mt-auto w-full">
                Save TMDB settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-full border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Email delivery</CardTitle>
          </CardHeader>
          <CardContent className="flex h-full flex-col">
            <p className="min-h-[72px] text-sm leading-6 text-muted-foreground">
              These SMTP settings are stored for future invite emails, notifications and
              digest workflows. Empty values keep the environment fallback active, including
              `SMTP_PORT` and `SMTP_SECURE` when the admin section remains untouched.
            </p>
            <form action={updateEmailSettingsAction} className="mt-4 flex flex-1 flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="smtp-host">SMTP host</FieldLabel>
                <Input
                  id="smtp-host"
                  name="smtpHost"
                  defaultValue={adminState.config.smtpHost ?? ""}
                  placeholder="smtp.example.com"
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-[140px_1fr] md:items-end">
                <Field>
                  <FieldLabel htmlFor="smtp-port">Port</FieldLabel>
                  <Input
                    id="smtp-port"
                    name="smtpPort"
                    type="number"
                    defaultValue={adminState.config.smtpPort.toString()}
                    placeholder="587"
                  />
                </Field>
                <div>
                  <SwitchField
                    name="smtpSecure"
                    label="Use secure SMTP"
                    description="Recommended for port 465 and production SMTP relays."
                    defaultChecked={adminState.config.smtpSecure}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="smtp-user">SMTP user</FieldLabel>
                  <Input
                    id="smtp-user"
                    name="smtpUser"
                    defaultValue={adminState.config.smtpUser ?? ""}
                    placeholder="mailer@example.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="smtp-password">SMTP password</FieldLabel>
                  <Input
                    id="smtp-password"
                    name="smtpPassword"
                    type="password"
                    defaultValue={adminState.config.smtpPassword ?? ""}
                    placeholder="App password or SMTP secret"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="smtp-from">From</FieldLabel>
                <Input
                  id="smtp-from"
                  name="smtpFrom"
                  defaultValue={adminState.config.smtpFrom ?? ""}
                  placeholder="movieshare <noreply@example.com>"
                />
              </Field>
              <Button type="submit" className="mt-auto w-full">
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
              Choose which sign-in methods movieshare should expose. `AUTH_*` env vars can
              bootstrap these toggles on first setup, then the admin panel can override
              them without a rebuild.
            </p>
            <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Email and password</p>
              <p className="mt-1">
                This stays available as the main fallback sign-in method.
              </p>
            </div>
            <form action={updateAccessMethodSettingsAction} className="grid gap-4">
              <SwitchField
                name="authEmailCodeEnabled"
                label="Email code"
                description="Allow people to request a short sign-in code by email."
                defaultChecked={adminState.accessMethodSettings.authEmailCodeEnabled}
              />
              <SwitchField
                name="authMagicLinkEnabled"
                label="Magic link"
                description="Allow passwordless access from a sign-in link sent by email."
                defaultChecked={adminState.accessMethodSettings.authMagicLinkEnabled}
              />
              <SwitchField
                name="authPasskeyEnabled"
                label="Passkeys"
                description="Expose passkey sign-in and profile management on supported devices."
                defaultChecked={adminState.accessMethodSettings.authPasskeyEnabled}
              />
              <SwitchField
                name="authTwoFactorEnabled"
                label="Two-factor auth"
                description="Let users with a password login add an authenticator app."
                defaultChecked={adminState.accessMethodSettings.authTwoFactorEnabled}
              />
              <Button type="submit" className="w-full">
                Save access methods
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Notification defaults</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Define the baseline delivery policy for everyone in movieshare. Users can
            override these defaults from their own profile settings.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>Push delivery keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Push can be bootstrapped from `VAPID_*` env vars or overridden here at
                runtime. Database values take priority and let you rotate keys without a
                rebuild.
              </p>
              <div className="flex flex-wrap gap-2">
                <SourceBadge source={pushRuntime.source ?? "missing"} />
                <Badge variant={pushRuntime.vapidConfigured ? "secondary" : "outline"}>
                  {pushRuntime.vapidConfigured ? "VAPID ready" : "VAPID missing"}
                </Badge>
              </div>
              <form action={updatePushDeliverySettingsAction} className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="vapid-public-key">Public key</FieldLabel>
                  <Textarea
                    id="vapid-public-key"
                    name="vapidPublicKey"
                    rows={3}
                    defaultValue={adminState.config.vapidPublicKey ?? ""}
                    className="h-24 resize-none font-mono text-xs"
                    placeholder="BOr..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="vapid-private-key">Private key</FieldLabel>
                  <Textarea
                    id="vapid-private-key"
                    name="vapidPrivateKey"
                    rows={3}
                    defaultValue={adminState.config.vapidPrivateKey ?? ""}
                    className="h-24 resize-none font-mono text-xs"
                    placeholder="6W0..."
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="vapid-subject">Subject</FieldLabel>
                  <Input
                    id="vapid-subject"
                    name="vapidSubject"
                    defaultValue={adminState.config.vapidSubject ?? ""}
                    placeholder="mailto:ops@example.com"
                  />
                </Field>
                <Button type="submit" className="w-full">
                  Save push keys
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle>Default channels</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationPreferenceEditor
                scope="admin"
                preferences={notificationPreferences.map((preference) => ({
                  category: preference.category,
                  label: preference.label,
                  description: preference.description,
                  defaults: {
                    inAppEnabled: preference.inAppEnabled,
                    emailEnabled: preference.emailEnabled,
                    pushEnabled: preference.pushEnabled,
                  },
                  effective: {
                    inAppEnabled: preference.inAppEnabled,
                    emailEnabled: preference.emailEnabled,
                    pushEnabled: preference.pushEnabled,
                  },
                  pushAvailable: preference.pushAvailable,
                }))}
                pushRuntime={pushRuntime}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Access status</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            See which access methods are live right now, which ones are switched off and
            which ones are still blocked by missing prerequisites such as SMTP or HTTPS.
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
                    <SourceBadge source={config.source} />
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
                    {runtimeCopy} `STREAMING_*` env vars can also bootstrap slot state before
                    the admin panel takes over.
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
