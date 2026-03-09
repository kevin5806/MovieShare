"use client";

import { Activity, BellRing, CheckCheck, Inbox, MailPlus, Radio, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "@/features/notifications/actions";
import type { NotificationItem } from "@/server/services/notification-service";
import { RelativeTime } from "@/components/time/relative-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NotificationInboxProps = {
  notifications: NotificationItem[];
};

type NotificationFilter = "all" | "unread" | "action" | "read";

function getNotificationIcon(kind: NotificationItem["kind"]) {
  if (kind === "list_invite") {
    return MailPlus;
  }

  if (kind === "friend_invite") {
    return Users;
  }

  if (kind === "live_session") {
    return Radio;
  }

  return Activity;
}

export function NotificationInbox({ notifications }: NotificationInboxProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [isPending, startTransition] = useTransition();

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.read);
    }

    if (filter === "action") {
      return notifications.filter((notification) => notification.actionable);
    }

    if (filter === "read") {
      return notifications.filter((notification) => notification.read);
    }

    return notifications;
  }, [filter, notifications]);

  const unreadKeys = notifications
    .filter((notification) => !notification.read)
    .map((notification) => notification.key);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction(unreadKeys);
      router.refresh();
      toast.success("All visible unread notifications marked as read.");
    });
  }

  function handleToggleRead(notification: NotificationItem) {
    startTransition(async () => {
      if (notification.read) {
        await markNotificationUnreadAction(notification.key);
        toast.success("Notification marked as unread.");
      } else {
        await markNotificationReadAction(notification.key);
        toast.success("Notification marked as read.");
      }

      router.refresh();
    });
  }

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Inbox feed</CardTitle>
          <p className="text-sm text-muted-foreground">
            Read state is now persistent per user across invites, live sessions and recent
            activity.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || unreadKeys.length === 0}
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "action" ? "default" : "outline"}
            onClick={() => setFilter("action")}
          >
            Actionable
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "read" ? "default" : "outline"}
            onClick={() => setFilter("read")}
          >
            Read
          </Button>
        </div>

        {filteredNotifications.length ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.kind);

              return (
                <div
                  key={notification.key}
                  className="rounded-3xl border border-border/70 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          <Badge variant={notification.read ? "outline" : "secondary"}>
                            {notification.badgeLabel}
                          </Badge>
                          {!notification.read ? <Badge>Unread</Badge> : null}
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <RelativeTime value={notification.occurredAt} />
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <Link
                        href={notification.href}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "outline" }),
                        )}
                      >
                        <BellRing className="size-4" />
                        Open
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant={notification.read ? "outline" : "default"}
                        disabled={isPending}
                        onClick={() => handleToggleRead(notification)}
                      >
                        {notification.read ? "Mark unread" : "Mark read"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-background p-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Inbox className="size-4" />
              Nothing matches this filter
            </div>
            <p className="mt-2">
              Try another filter or come back when new shared activity reaches your inbox.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
