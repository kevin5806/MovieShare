"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      toast.success("movieshare installed.");
      setInstalled(true);
    }

    setInstallPrompt(null);
  }

  if (installed || !installPrompt) {
    return null;
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleInstall}>
      <Download className="mr-2 size-4" />
      Install app
    </Button>
  );
}
