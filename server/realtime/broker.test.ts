import { describe, expect, it, vi } from "vitest";

import {
  realtimeBroker,
  subscribeToChannels,
  type RealtimeEnvelope,
} from "@/server/realtime/broker";

describe("realtime broker", () => {
  it("delivers messages to subscribers and stops after unsubscribe", async () => {
    const listener = vi.fn<(message: RealtimeEnvelope) => void>();
    const unsubscribe = subscribeToChannels(["list:list-1"], listener);

    await realtimeBroker.publish({
      channel: "list:list-1",
      event: "list.item.added",
      payload: {
        listItemId: "item-1",
      },
      occurredAt: new Date().toISOString(),
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    await realtimeBroker.publish({
      channel: "list:list-1",
      event: "list.feedback.updated",
      payload: {
        listItemId: "item-1",
      },
      occurredAt: new Date().toISOString(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
