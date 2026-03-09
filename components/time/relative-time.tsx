"use client";

import { formatDistanceToNow } from "date-fns";
import { useSyncExternalStore } from "react";

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function formatFallback(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function RelativeTime({
  value,
  addSuffix = true,
  fallback,
}: {
  value: Date | string;
  addSuffix?: boolean;
  fallback?: string;
}) {
  const date = asDate(value);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {mounted
        ? formatDistanceToNow(date, { addSuffix })
        : fallback ?? formatFallback(date)}
    </time>
  );
}
