import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectionMode } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    movieList: {
      findFirst: vi.fn(),
    },
    selectionRun: {
      create: vi.fn(),
    },
  },
  realtimeBroker: {
    publish: vi.fn(),
  },
  logActivity: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  db: mocks.db,
}));

vi.mock("@/server/realtime/broker", () => ({
  realtimeBroker: mocks.realtimeBroker,
}));

vi.mock("@/server/services/activity-log", () => ({
  logActivity: mocks.logActivity,
}));

import { runSelection } from "@/server/services/selection-service";

describe("selection-service", () => {
  beforeEach(() => {
    mocks.db.selectionRun.create.mockResolvedValue({
      id: "run-1",
      results: [],
    });
  });

  it("persists ranked results and emits activity for the winning candidate", async () => {
    mocks.db.movieList.findFirst.mockResolvedValue({
      id: "list-1",
      items: [
        {
          id: "item-strong",
          feedbacks: [
            {
              interest: "INTERESTED",
              seenState: "UNSEEN",
              wouldRewatch: true,
            },
          ],
          movie: {
            tmdbVoteAverage: 8,
            genres: [{ name: "Drama" }],
            runtimeMinutes: 110,
            overview: "A warm friendship journey.",
          },
        },
        {
          id: "item-weak",
          feedbacks: [
            {
              interest: "NOT_INTERESTED",
              seenState: "SEEN",
              wouldRewatch: false,
            },
          ],
          movie: {
            tmdbVoteAverage: 6,
            genres: [{ name: "Thriller" }],
            runtimeMinutes: 145,
            overview: "A dark revenge story.",
          },
        },
      ],
    });

    await runSelection("user-1", "list-1", SelectionMode.AUTOMATIC);

    expect(mocks.db.selectionRun.create).toHaveBeenCalledTimes(1);
    const [{ data }] = mocks.db.selectionRun.create.mock.calls[0];
    expect(data.summary).toContain("Automatic mode");
    expect(data.results.create).toMatchObject([
      {
        listItemId: "item-strong",
        rank: 1,
        selected: true,
      },
      {
        listItemId: "item-weak",
        rank: 2,
        selected: false,
      },
    ]);

    expect(mocks.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: "list-1",
        event: "selection.run.completed",
        payload: expect.objectContaining({
          selectedListItemId: "item-strong",
        }),
      }),
    );

    expect(mocks.realtimeBroker.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "list:list-1",
        event: "selection.run.completed",
        payload: expect.objectContaining({
          selectedListItemId: "item-strong",
          mode: SelectionMode.AUTOMATIC,
        }),
      }),
    );
  });

  it("rejects selections for empty lists", async () => {
    mocks.db.movieList.findFirst.mockResolvedValue({
      id: "list-1",
      items: [],
    });

    await expect(runSelection("user-1", "list-1", SelectionMode.MANUAL)).rejects.toThrow(
      "Add at least one movie before running a selection.",
    );
  });
});
