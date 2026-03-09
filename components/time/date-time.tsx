"use client";

import { useSyncExternalStore } from "react";

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function formatFallback(date: Date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatLocalized(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DateTimeText({
  value,
  fallback,
}: {
  value: Date | string;
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
      {mounted ? formatLocalized(date) : fallback ?? formatFallback(date)}
    </time>
  );
}
