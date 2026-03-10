"use client";

import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RegisterServiceWorker />
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
