import { NotificationCategory } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { ensureSystemConfigSeeded } from "@/server/services/system-config";

type PreferenceDefinition = {
  category: NotificationCategory;
  label: string;
  description: string;
  defaults: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  };
};

export const notificationPreferenceDefinitions: PreferenceDefinition[] = [
  {
    category: NotificationCategory.LIST_INVITES,
    label: "List invites",
    description: "New invites, accepted links and list-access changes.",
    defaults: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
    },
  },
  {
    category: NotificationCategory.FRIEND_INVITES,
    label: "Friend invites",
    description: "Incoming friend requests and reciprocal social actions.",
    defaults: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
    },
  },
  {
    category: NotificationCategory.WATCH_SESSIONS,
    label: "Watch sessions",
    description: "Live session starts, room activity and checkpoint-driven reminders.",
    defaults: {
      inAppEnabled: true,
      emailEnabled: false,
      pushEnabled: false,
    },
  },
  {
    category: NotificationCategory.ACTIVITY_DIGEST,
    label: "Shared activity",
    description: "Collaborative list activity and lower-priority room events.",
    defaults: {
      inAppEnabled: true,
      emailEnabled: false,
      pushEnabled: false,
    },
  },
  {
    category: NotificationCategory.PRODUCT_UPDATES,
    label: "Product updates",
    description: "Release notes, maintenance updates and future operational notices.",
    defaults: {
      inAppEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
    },
  },
];

function buildDefinitionMap() {
  return new Map(
    notificationPreferenceDefinitions.map((definition) => [definition.category, definition] as const),
  );
}

function isSystemConfigPristine(config: { createdAt: Date; updatedAt: Date }) {
  return config.createdAt.getTime() === config.updatedAt.getTime();
}

export async function ensureSystemNotificationPreferencesSeeded() {
  if (!("systemNotificationPreference" in db) || !db.systemNotificationPreference) {
    return notificationPreferenceDefinitions.map((definition) => ({
      id: definition.category,
      category: definition.category,
      inAppEnabled: definition.defaults.inAppEnabled,
      emailEnabled: definition.defaults.emailEnabled,
      pushEnabled: definition.defaults.pushEnabled,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }));
  }

  const operations = notificationPreferenceDefinitions.map((definition) =>
    db.systemNotificationPreference.upsert({
      where: {
        category: definition.category,
      },
      update: {},
      create: {
        category: definition.category,
        ...definition.defaults,
      },
    }),
  );

  return db.$transaction(operations);
}

export async function getPushRuntimeConfig() {
  const config =
    "systemConfig" in db && db.systemConfig
      ? await ensureSystemConfigSeeded()
      : {
          createdAt: new Date(0),
          updatedAt: new Date(0),
          pushNotificationsEnabled: env.PUSH_NOTIFICATIONS_ENABLED,
        };
  const vapidConfigured = Boolean(
    env.VAPID_PUBLIC_KEY.trim() && env.VAPID_PRIVATE_KEY.trim() && env.VAPID_SUBJECT.trim(),
  );
  const usesEnvironmentFallback = isSystemConfigPristine(config) && env.PUSH_NOTIFICATIONS_ENABLED;
  const isEnabled = usesEnvironmentFallback ? env.PUSH_NOTIFICATIONS_ENABLED : config.pushNotificationsEnabled;

  return {
    isEnabled,
    vapidConfigured,
    publicKey: env.VAPID_PUBLIC_KEY || null,
    subject: env.VAPID_SUBJECT || null,
    source: usesEnvironmentFallback ? ("environment" as const) : ("database" as const),
  };
}

export async function getSystemNotificationPreferences() {
  const [defaults, pushRuntime] = await Promise.all([
    ensureSystemNotificationPreferencesSeeded(),
    getPushRuntimeConfig(),
  ]);
  const definitionMap = buildDefinitionMap();

  return defaults.map((preference) => {
    const definition = definitionMap.get(preference.category);

    return {
      ...preference,
      label: definition?.label ?? preference.category,
      description: definition?.description ?? "",
      pushAvailable: pushRuntime.vapidConfigured && pushRuntime.isEnabled,
    };
  });
}

export async function getEffectiveNotificationPreferences(userId: string) {
  const userOverridesPromise =
    "userNotificationPreference" in db && db.userNotificationPreference
      ? db.userNotificationPreference.findMany({
          where: {
            userId,
          },
        })
      : Promise.resolve([]);

  const [systemDefaults, userOverrides] = await Promise.all([
    getSystemNotificationPreferences(),
    userOverridesPromise,
  ]);
  const overrideMap = new Map(
    userOverrides.map((override) => [override.category, override] as const),
  );

  return systemDefaults.map((systemPreference) => {
    const override = overrideMap.get(systemPreference.category);

    return {
      category: systemPreference.category,
      label: systemPreference.label,
      description: systemPreference.description,
      defaults: {
        inAppEnabled: systemPreference.inAppEnabled,
        emailEnabled: systemPreference.emailEnabled,
        pushEnabled: systemPreference.pushEnabled,
      },
      effective: {
        inAppEnabled: override?.inAppEnabled ?? systemPreference.inAppEnabled,
        emailEnabled: override?.emailEnabled ?? systemPreference.emailEnabled,
        pushEnabled: override?.pushEnabled ?? systemPreference.pushEnabled,
      },
      override: override
        ? {
            inAppEnabled: override.inAppEnabled,
            emailEnabled: override.emailEnabled,
            pushEnabled: override.pushEnabled,
          }
        : null,
      pushAvailable: systemPreference.pushAvailable,
    };
  });
}

export async function getNotificationSettingsOverview(userId: string) {
  const [preferences, subscriptions, pushRuntime] = await Promise.all([
    getEffectiveNotificationPreferences(userId),
    db.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    getPushRuntimeConfig(),
  ]);

  return {
    preferences,
    pushRuntime,
    subscriptions,
  };
}

export async function updateSystemNotificationPreferences(input: {
  pushNotificationsEnabled: boolean;
  preferences: Array<{
    category: NotificationCategory;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }>;
}) {
  await Promise.all([ensureSystemConfigSeeded(), ensureSystemNotificationPreferencesSeeded()]);

  await db.$transaction([
    db.systemConfig.update({
      where: {
        scope: "default",
      },
      data: {
        pushNotificationsEnabled: input.pushNotificationsEnabled,
      },
    }),
    ...input.preferences.map((preference) =>
      db.systemNotificationPreference.update({
        where: {
          category: preference.category,
        },
        data: {
          inAppEnabled: preference.inAppEnabled,
          emailEnabled: preference.emailEnabled,
          pushEnabled: preference.pushEnabled,
        },
      }),
    ),
  ]);
}

export async function updateUserNotificationPreferences(input: {
  userId: string;
  preferences: Array<{
    category: NotificationCategory;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }>;
}) {
  await ensureSystemNotificationPreferencesSeeded();

  await db.$transaction(
    input.preferences.map((preference) =>
      db.userNotificationPreference.upsert({
        where: {
          userId_category: {
            userId: input.userId,
            category: preference.category,
          },
        },
        update: {
          inAppEnabled: preference.inAppEnabled,
          emailEnabled: preference.emailEnabled,
          pushEnabled: preference.pushEnabled,
        },
        create: {
          userId: input.userId,
          category: preference.category,
          inAppEnabled: preference.inAppEnabled,
          emailEnabled: preference.emailEnabled,
          pushEnabled: preference.pushEnabled,
        },
      }),
    ),
  );
}
