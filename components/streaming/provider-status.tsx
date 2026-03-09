import { Badge } from "@/components/ui/badge";
import type { StreamingProviderAdapter } from "@/server/services/streaming/types";

export function StreamingProviderStatus({
  provider,
}: {
  provider: StreamingProviderAdapter | undefined;
}) {
  if (!provider) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{provider.isReady ? "Ready" : "Not integrated"}</Badge>
      <Badge variant="secondary">
        {provider.maturity === "placeholder" ? "Placeholder slot" : "Deployment-specific"}
      </Badge>
      <Badge variant={provider.compliance === "do-not-enable" ? "destructive" : "secondary"}>
        {provider.compliance === "do-not-enable"
          ? "Do not enable"
          : "Needs deployment review"}
      </Badge>
    </div>
  );
}

export function StreamingProviderNotes({
  provider,
}: {
  provider: StreamingProviderAdapter | undefined;
}) {
  if (!provider) {
    return null;
  }

  return (
    <div className="space-y-3">
      {provider.readinessNote ? (
        <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
          {provider.readinessNote}
        </div>
      ) : null}
      <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
        {provider.complianceNote}
      </div>
    </div>
  );
}
