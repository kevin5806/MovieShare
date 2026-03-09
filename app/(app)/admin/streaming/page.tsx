import { StreamingProviderKey } from "@/generated/prisma/client";
import { updateStreamingProviderAction } from "@/features/system/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/server/session";
import { getStreamingAdminState } from "@/server/services/streaming";

export default async function StreamingAdminPage() {
  await requireAdminSession();
  const adminState = await getStreamingAdminState();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="secondary">System admin</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Streaming providers</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          In futuro sara possibile aggiungere ulteriori provider di streaming configurabili.
        </p>
      </section>

      <Card className="border-border/70 bg-card/85">
        <CardHeader>
          <CardTitle>Current active provider</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">
            {adminState.activeConfig?.label || "No provider active"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The only provider scaffolded today is <strong>vixsrc</strong>.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        {adminState.configs.map((config) => (
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
              <form action={updateStreamingProviderAction} className="space-y-4">
                <input type="hidden" name="provider" value={config.provider} />
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                  <input type="checkbox" name="isEnabled" defaultChecked={config.isEnabled} />
                  Enable streaming support for this provider
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={config.isActive} />
                  Mark as active provider
                </label>
                <Button type="submit" className="w-full">
                  Save provider settings
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
