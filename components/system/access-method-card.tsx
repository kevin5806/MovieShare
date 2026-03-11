import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AccessMethodCardProps = {
  method: {
    key: string;
    label: string;
    description: string;
    isEnabled: boolean;
    availability: "live" | "config-only" | "blocked";
    source?: "database" | "environment" | "missing";
    requirement: string;
  };
};

const availabilityCopy = {
  live: {
    label: "Live",
    variant: "default" as const,
  },
  "config-only": {
    label: "Config only",
    variant: "secondary" as const,
  },
  blocked: {
    label: "Blocked",
    variant: "secondary" as const,
  },
};

export function AccessMethodCard({ method }: AccessMethodCardProps) {
  const availability = availabilityCopy[method.availability];

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-2">
          <CardTitle>{method.label}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{method.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={availability.variant}>{availability.label}</Badge>
          <Badge variant="secondary">{method.isEnabled ? "On" : "Off"}</Badge>
          {method.source === "environment" ? (
            <Badge variant="secondary">Env bootstrap</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          {method.requirement}
        </div>
      </CardContent>
    </Card>
  );
}
