export type RealtimeEvent =
  | "list.item.added"
  | "list.item.removed"
  | "list.feedback.updated"
  | "list.invite.created"
  | "list.member.joined"
  | "list.member.role.updated"
  | "list.member.removed"
  | "list.presentation.updated"
  | "selection.run.completed"
  | "watch.session.created"
  | "watch.session.checkpoint.saved";

export type RealtimeEnvelope = {
  channel: string;
  event: RealtimeEvent;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export interface RealtimeBroker {
  publish(message: RealtimeEnvelope): Promise<void>;
}

type RealtimeListener = (message: RealtimeEnvelope) => void;

const globalForRealtime = globalThis as {
  realtimeListeners?: Map<string, Set<RealtimeListener>>;
};

const listeners = globalForRealtime.realtimeListeners ?? new Map<string, Set<RealtimeListener>>();

globalForRealtime.realtimeListeners = listeners;

export function subscribeToChannels(
  channels: string[],
  listener: RealtimeListener,
) {
  for (const channel of channels) {
    const channelListeners = listeners.get(channel) ?? new Set<RealtimeListener>();
    channelListeners.add(listener);
    listeners.set(channel, channelListeners);
  }

  return () => {
    for (const channel of channels) {
      const channelListeners = listeners.get(channel);

      if (!channelListeners) {
        continue;
      }

      channelListeners.delete(listener);

      if (!channelListeners.size) {
        listeners.delete(channel);
      }
    }
  };
}

export const realtimeBroker: RealtimeBroker = {
  async publish(message) {
    const channelListeners = listeners.get(message.channel);

    if (!channelListeners?.size) {
      return;
    }

    for (const listener of channelListeners) {
      listener(message);
    }
  },
};
