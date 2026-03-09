import {
  updateEmailSettingsAction,
  updateStreamingProviderAction,
  updateTmdbSettingsAction,
} from "@/features/system/actions";
import { SwitchField } from "@/components/forms/switch-field";
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
    adminState.streaming.providers.map((provider) => [provider.key, provider]),
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
              Additional streaming providers can be introduced over time without binding
              the rest of the product to a single adapter.
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
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Streaming providers</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Gestisci i provider di streaming disponibili. Ogni slot può essere abilitato/disabilitato e marcato come preferito (solo uno attivo alla volta). 
            Il provider VixSrc è deployment-specific: genera embed URL diretti (es. https://vixsrc.to/movie/{tmdbId}) se VIXSRC_BASE_URL è configurata nelle env. 
            Maturity: deployment-specific | Compliance: richiede review legale per il tuo deployment. Non implica tele-sharing sincronizzato.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {adminState.streaming.configs.map((config) => {
            const isVixsrc = config.provider === "VIXSRC";
            const provider = providerCatalog.get(config.provider);

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
                    {isVixsrc
                      ? config.notes ||
                        "Provider embed-based. Pronto se VIXSRC_BASE_URL è settata (es. https://vixsrc.to). Genera URL embed per film/TV. Richiede verifica compliance deployment-specific. Non usare per sorgenti non autorizzate."
                      : config.notes ||
                        "Provider slot scaffolded. Adapter can be replaced later without touching the core domain."}
                  </p>
                  <StreamingProviderNotes provider={provider} />
                  <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    {isVixsrc
                      ? "Abilitando questo provider, movieshare tenterà di generare embed URL per le watch session. Playback dipende da configurazione env e stabilità della sorgente. Solo embed – no streaming diretto o sync. Review compliance obbligatoria prima di produzione."
                      : "Enabling this slot only marks it as the preferred provider in the domain. Playback remains unavailable until a compliant deployment-specific adapter is wired."}
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