import { ArrowRight, Clock3, Film, Layers3, Radio, UsersRound } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { redirectIfAuthenticated } from "@/server/session";

const showcaseMovies = [
  { title: "Arrival", meta: "Added by Kevin", icon: Film },
  { title: "Perfect Days", meta: "Interested by 3 members", icon: Clock3 },
  { title: "Decision to Leave", meta: "Top pick in mood mode", icon: Layers3 },
];

export default async function Home() {
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex items-center justify-between rounded-[32px] border border-border/70 bg-background/90 px-6 py-5 shadow-sm backdrop-blur">
          <BrandMark />
          <div className="flex items-center gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Sign in
            </Link>
            <Link href="/login?mode=sign-up" className={cn(buttonVariants())}>
              Get started
            </Link>
          </div>
        </header>

        <section className="grid gap-8 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Self-hosted</Badge>
              <Badge variant="secondary">Collaborative lists</Badge>
              <Badge variant="secondary">Built for groups</Badge>
            </div>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-7xl">
                Shared movie lists that feel organized before the night even starts.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                movieshare helps friends collect ideas, compare reactions and settle on what
                to watch together in one calm workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/login?mode=sign-up" className={cn(buttonVariants({ size: "lg" }))}>
                Open your workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Continue existing account
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Lists that stay social", "Every movie keeps the proposer, reactions and decisions in the same place."],
                ["Picking gets easier", "Use a simple vote, a random pick or a guided filter when the room is undecided."],
                ["Watch together, your way", "Keep track of who started, who joined and where everyone stopped."],
              ].map(([title, description]) => (
                <Card key={title} className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-border/70 bg-card/90 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <div className="rounded-[28px] border border-border/70 bg-background p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    Friday movie room
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Weekend watchlist</h2>
                </div>
                <Badge>3 online</Badge>
              </div>

              <div className="mt-6 grid gap-3">
                {showcaseMovies.map(({ title, meta, icon: Icon }) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-3xl border border-border/70 bg-card/80 px-4 py-3"
                  >
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{meta}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/70 bg-accent/55 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UsersRound className="size-4" />
                    Group snapshot
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Everyone can see who is interested, who already watched it and what still feels fresh.
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-accent/55 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Radio className="size-4" />
                    Shared watch history
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sessions keep a clear history of starts, pauses and resume points for the group.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
