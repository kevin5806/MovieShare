import { ActivityActorType, type Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

type LogActivityInput = {
  listId?: string;
  actorId?: string;
  actorType?: ActivityActorType;
  event: string;
  payload?: Prisma.InputJsonValue;
};

export async function logActivity(input: LogActivityInput) {
  return db.activityLog.create({
    data: {
      listId: input.listId,
      actorId: input.actorId,
      actorType: input.actorType ?? ActivityActorType.USER,
      event: input.event,
      payload: input.payload,
    },
  });
}
