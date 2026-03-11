import webpush, { type PushSubscription } from "web-push";

import { NotificationCategory } from "@/generated/prisma/client";
import { db } from "@/server/db";
import {
  getEffectiveNotificationPreferences,
  getPushRuntimeConfig,
} from "@/server/services/notification-preference-service";

let configuredFingerprint: string | null = null;

function ensureWebPushConfigured(input: {
  publicKey: string | null;
  privateKey: string | null;
  subject: string | null;
}) {
  const publicKey = input.publicKey?.trim() || "";
  const privateKey = input.privateKey?.trim() || "";
  const subject = input.subject?.trim() || "";

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  const fingerprint = `${subject}:${publicKey}:${privateKey}`;

  if (configuredFingerprint === fingerprint) {
    return true;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configuredFingerprint = fingerprint;

  return true;
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
}) {
  const runtime = await getPushRuntimeConfig();

  if (!runtime.vapidConfigured) {
    throw new Error("Push notifications are not configured for this deployment.");
  }

  return db.pushSubscription.upsert({
    where: {
      endpoint: input.endpoint,
    },
    update: {
      userId: input.userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
      isActive: true,
      lastUsedAt: new Date(),
    },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
}

export async function deactivatePushSubscription(input: {
  userId: string;
  endpoint: string;
}) {
  const existing = await db.pushSubscription.findFirst({
    where: {
      userId: input.userId,
      endpoint: input.endpoint,
    },
  });

  if (!existing) {
    return null;
  }

  return db.pushSubscription.update({
    where: {
      id: existing.id,
    },
    data: {
      isActive: false,
    },
  });
}

async function getUserPushPreferenceEnabled(
  userId: string,
  category: NotificationCategory,
) {
  const preferences = await getEffectiveNotificationPreferences(userId);
  return preferences.find((preference) => preference.category === category)?.effective.pushEnabled ?? false;
}

export async function sendPushNotificationToUser(input: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
  tag?: string;
}) {
  const [runtime, pushAllowed, subscriptions] = await Promise.all([
    getPushRuntimeConfig(),
    getUserPushPreferenceEnabled(input.userId, input.category),
    db.pushSubscription.findMany({
      where: {
        userId: input.userId,
        isActive: true,
      },
    }),
  ]);

  if (!runtime.isEnabled || !runtime.vapidConfigured || !pushAllowed || !subscriptions.length) {
    return {
      status: "skipped" as const,
      delivered: 0,
    };
  }

  if (!ensureWebPushConfigured(runtime)) {
    return {
      status: "skipped" as const,
      delivered: 0,
    };
  }

  let delivered = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        } satisfies PushSubscription,
        JSON.stringify({
          title: input.title,
          body: input.body,
          url: input.url,
          tag: input.tag ?? `${input.category}:${input.userId}`,
        }),
      );

      delivered += 1;

      await db.pushSubscription.update({
        where: {
          id: subscription.id,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : null;

      if (statusCode === 404 || statusCode === 410) {
        await db.pushSubscription.update({
          where: {
            id: subscription.id,
          },
          data: {
            isActive: false,
          },
        });
      } else {
        console.error("sendPushNotificationToUser failed", error);
      }
    }
  }

  return {
    status: delivered ? ("sent" as const) : ("skipped" as const),
    delivered,
  };
}

export async function sendTestPushNotification(userId: string) {
  const runtime = await getPushRuntimeConfig();

  if (!runtime.isEnabled || !runtime.vapidConfigured) {
    throw new Error("Push notifications are not enabled for this deployment.");
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  if (!subscriptions.length) {
    throw new Error("No active push subscription was found for this user.");
  }

  if (!ensureWebPushConfigured(runtime)) {
    throw new Error("VAPID configuration is missing.");
  }

  let delivered = 0;

  for (const subscription of subscriptions) {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      } satisfies PushSubscription,
      JSON.stringify({
        title: "movieshare push test",
        body: "Push delivery is configured on this device.",
        url: "/notifications",
        tag: `push-test:${userId}`,
      }),
    );
    delivered += 1;
  }

  return {
    status: "sent" as const,
    delivered,
  };
}
