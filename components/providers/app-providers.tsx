"use client";

import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
