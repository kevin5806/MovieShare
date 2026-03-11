"use client";

import { BellRing, BellOff, Send } from "lucide-react";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PushSubscriptionCardProps = {
  pushRuntime: {
    isEnabled: boolean;
    vapidConfigured: boolean;
    publicKey: string | null;
    source?: "database" | "environment" | "missing";
  };
  activeSubscriptionCount: number;
};

function getBrowserPushState() {
  if (typeof window === "undefined") {
    return {
      permission: "default" as NotificationPermission,
      isSupported: false,
    };
  }

  const isSupported =
    "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  return {
    isSupported,
    permission: isSupported ? Notification.permission : ("default" as NotificationPermission),
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushSubscriptionCard({
  pushRuntime,
  activeSubscriptionCount,
}: PushSubscriptionCardProps) {
  const router = useRouter();
  const browserState = useSyncExternalStore(
    () => () => undefined,
    getBrowserPushState,
    getBrowserPushState,
  );
  const [permissionOverride, setPermissionOverride] = useState<NotificationPermission | null>(null);
  const [isPending, startTransition] = useTransition();
  const permission = permissionOverride ?? browserState.permission;
  const isSupported = browserState.isSupported;

  const isReady = pushRuntime.isEnabled && pushRuntime.vapidConfigured && Boolean(pushRuntime.publicKey);
  const summary = useMemo(() => {
    if (!isSupported) {
      return "This browser does not support web push notifications.";
    }

    if (!pushRuntime.vapidConfigured) {
      return "This deployment still needs VAPID keys in its environment before push can work.";
    }

    if (!pushRuntime.isEnabled) {
      return "Push is configured on the server but currently disabled by the admin.";
    }

    if (permission === "granted") {
      return "This browser can receive push notifications as soon as this device is subscribed.";
    }

    if (permission === "denied") {
      return "Browser push permission is denied for this site.";
    }

    return "Enable browser permission and register this device for push delivery.";
  }, [isSupported, permission, pushRuntime]);

  async function subscribe() {
    if (!isSupported || !pushRuntime.publicKey) {
      toast.error("Push notifications are not available in this browser.");
      return;
    }

    startTransition(async () => {
      try {
        const publicKey = pushRuntime.publicKey;

        if (!publicKey) {
          toast.error("Push public key is missing from this deployment.");
          return;
        }

        const nextPermission =
          permission === "granted" ? permission : await Notification.requestPermission();
        setPermissionOverride(nextPermission);

        if (nextPermission !== "granted") {
          toast.error("Push permission was not granted.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const response = await fetch("/api/notifications/push/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription.toJSON()),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(payload.error ?? "Unable to save the push subscription.");
          return;
        }

        toast.success("Push notifications enabled on this device.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to enable push notifications.");
      }
    });
  }

  async function unsubscribe() {
    if (!isSupported) {
      return;
    }

    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          toast.error("No push subscription exists for this browser.");
          return;
        }

        await fetch("/api/notifications/push/subscription", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        await subscription.unsubscribe();
        toast.success("Push notifications disabled on this device.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to disable push notifications.");
      }
    });
  }

  async function sendTestPush() {
    startTransition(async () => {
      const response = await fetch("/api/notifications/push/test", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; delivered?: number };

      if (!response.ok) {
        toast.error(payload.error ?? "Unable to send a test notification.");
        return;
      }

      toast.success(`Push test sent to ${payload.delivered ?? 0} active subscription(s).`);
    });
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Push notifications on this device</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{permission}</Badge>
          <Badge variant="secondary">{activeSubscriptionCount} active subscription(s)</Badge>
          {pushRuntime.source ? (
            <Badge variant="secondary">
              {pushRuntime.source === "environment"
                ? "Env bootstrap"
                : pushRuntime.source === "database"
                  ? "Admin override"
                  : "Not configured"}
            </Badge>
          ) : null}
          {isReady ? <Badge>Ready</Badge> : <Badge variant="outline">Not ready</Badge>}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
        <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
          To enable push here: the deployment must provide `VAPID_PUBLIC_KEY`,
          `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in env, admin must enable push in system
          settings, and then you can register this browser with the button below.
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={subscribe} disabled={isPending || !isReady}>
            <BellRing className="size-4" />
            Enable push
          </Button>
          <Button type="button" variant="outline" onClick={unsubscribe} disabled={isPending || !isSupported}>
            <BellOff className="size-4" />
            Disable push
          </Button>
          <Button type="button" variant="outline" onClick={sendTestPush} disabled={isPending || !isReady}>
            <Send className="size-4" />
            Send test push
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
