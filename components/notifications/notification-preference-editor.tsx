"use client";

import { BellRing, Mail, Smartphone } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { updateUserNotificationPreferencesAction } from "@/features/profile/actions";
import { updateSystemNotificationPreferencesAction } from "@/features/system/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type PreferenceRow = {
  category:
    | "LIST_INVITES"
    | "FRIEND_INVITES"
    | "WATCH_SESSIONS"
    | "ACTIVITY_DIGEST"
    | "PRODUCT_UPDATES";
  label: string;
  description: string;
  defaults: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  };
  effective: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  };
  pushAvailable: boolean;
};

type NotificationPreferenceEditorProps = {
  scope: "admin" | "user";
  preferences: PreferenceRow[];
  pushRuntime: {
    isEnabled: boolean;
    vapidConfigured: boolean;
    publicKey?: string | null;
    privateKey?: string | null;
    subject?: string | null;
    source?: "database" | "environment" | "missing";
  };
};

type ChannelKey = "inAppEnabled" | "emailEnabled" | "pushEnabled";
type NotificationCategoryValue = PreferenceRow["category"];

export function NotificationPreferenceEditor({
  scope,
  preferences,
  pushRuntime,
}: NotificationPreferenceEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(pushRuntime.isEnabled);
  const [rows, setRows] = useState(
    preferences.map((preference) => ({
      ...preference,
      effective: {
        ...preference.effective,
      },
    })),
  );

  const pushCopy = useMemo(() => {
    if (!pushRuntime.vapidConfigured) {
      return "Push needs VAPID keys from system settings or environment before the app can offer device subscriptions.";
    }

    return pushNotificationsEnabled
      ? "Push is available. Users still need to enable it on each device from their profile."
      : "Push is configured but currently disabled from the admin panel.";
  }, [pushNotificationsEnabled, pushRuntime.vapidConfigured]);

  function setChannel(category: NotificationCategoryValue, channel: ChannelKey, value: boolean) {
    setRows((current) =>
      current.map((row) =>
        row.category === category
          ? {
              ...row,
              effective: {
                ...row.effective,
                [channel]: value,
              },
            }
          : row,
      ),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set(
        "preferences",
        JSON.stringify(
          rows.map((row) => ({
            category: row.category,
            inAppEnabled: row.effective.inAppEnabled,
            emailEnabled: row.effective.emailEnabled,
            pushEnabled: row.effective.pushEnabled,
          })),
        ),
      );

      if (scope === "admin") {
        formData.set("pushNotificationsEnabled", pushNotificationsEnabled ? "true" : "false");
      }

      const result =
        scope === "admin"
          ? await updateSystemNotificationPreferencesAction(formData)
          : await updateUserNotificationPreferencesAction(formData);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success(
        scope === "admin"
          ? "Notification defaults saved."
          : "Your notification preferences were updated.",
      );
    });
  }

  return (
    <div className="space-y-4">
      {scope === "admin" ? (
        <div className="rounded-[28px] border border-border/70 bg-background p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Push delivery master switch</p>
                {pushRuntime.source ? (
                  <Badge variant="secondary">
                    {pushRuntime.source === "environment"
                      ? "Env bootstrap"
                      : pushRuntime.source === "database"
                        ? "Database"
                        : "Not configured"}
                  </Badge>
                ) : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{pushCopy}</p>
                <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Setup order: add VAPID keys in the admin panel or env, enable push here,
                  then each user subscribes from their own profile.
                </div>
              </div>
            <div className="flex items-center gap-3">
              <Badge variant={pushRuntime.vapidConfigured ? "secondary" : "outline"}>
                {pushRuntime.vapidConfigured ? "VAPID configured" : "VAPID missing"}
              </Badge>
              <Switch
                checked={pushNotificationsEnabled}
                onCheckedChange={setPushNotificationsEnabled}
                disabled={!pushRuntime.vapidConfigured}
                aria-label="Enable push notifications"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.category}
            className="space-y-4 rounded-[28px] border border-border/70 bg-background p-5"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{row.label}</p>
                {row.pushAvailable ? <Badge variant="secondary">Push-ready</Badge> : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{row.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <BellRing className="size-4" />
                  In-app
                </span>
                <Switch
                  checked={row.effective.inAppEnabled}
                  onCheckedChange={(checked) => setChannel(row.category, "inAppEnabled", checked)}
                  aria-label={`${row.label} in-app`}
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Mail className="size-4" />
                  Email
                </span>
                <Switch
                  checked={row.effective.emailEnabled}
                  onCheckedChange={(checked) => setChannel(row.category, "emailEnabled", checked)}
                  aria-label={`${row.label} email`}
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Smartphone className="size-4" />
                  Push
                </span>
                <Switch
                  checked={row.effective.pushEnabled}
                  onCheckedChange={(checked) => setChannel(row.category, "pushEnabled", checked)}
                  disabled={!row.pushAvailable || (scope === "admin" && !pushNotificationsEnabled)}
                  aria-label={`${row.label} push`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" onClick={handleSave} disabled={isPending}>
        Save notification preferences
      </Button>
    </div>
  );
}
