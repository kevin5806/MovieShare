export type RealtimeEvent =
  | "list.item.added"
  | "list.feedback.updated"
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

export const realtimeBroker: RealtimeBroker = {
  async publish() {
    // TODO: Replace with a self-hosted broker implementation.
  },
};
