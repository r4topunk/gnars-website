"use client";

import { useMemo } from "react";
import { Construction, PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRoundAdminAddress } from "@/features/rounds/admin";
import { getRoundState } from "@/features/rounds/state";
import type { Round } from "@/features/rounds/types";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";
import { RoundCard } from "./RoundCard";

export function RoundsIndexView({ rounds, error }: { rounds: Round[]; error?: string }) {
  const { address, adminAddress } = useUserAddress();
  const connectedAdminAddress = adminAddress ?? address;
  const isAdmin = isRoundAdminAddress(connectedAdminAddress);
  const grouped = useMemo(
    () => ({
      open: rounds.filter((round) => getRoundState(round) === "submissions_open"),
      voting: rounds.filter((round) => getRoundState(round) === "voting_open"),
      upcoming: rounds.filter((round) => getRoundState(round) === "upcoming"),
      completed: rounds.filter((round) => getRoundState(round) === "ended"),
    }),
    [rounds],
  );

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-8">
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <Construction className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Rounds is coming soon</p>
            <p className="mt-0.5 leading-6">
              This feature isn&apos;t live yet — we&apos;re still finishing development and the
              backend isn&apos;t deployed. It&apos;s on the roadmap; check back soon.
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-5 rounded-lg border border-border bg-muted/30 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Community funding
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Rounds</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
              Time-boxed contests for clips, spots, build ideas, and community work. Submit during
              the open window, then the DAO votes on what should get attention next.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="w-fit">
              <Link href="/rounds/request">
                <PlusCircle className="size-4" />
                Request a round
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild className="w-fit">
                <Link href="/rounds/admin">
                  <Settings className="size-4" />
                  Admin Dashboard
                </Link>
              </Button>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <RoundSection
          title="Open for submissions"
          rounds={grouped.open}
          empty="No open rounds right now."
        />
        <RoundSection
          title="Voting now"
          rounds={grouped.voting}
          empty="No rounds are in voting right now."
        />
        <RoundSection title="Upcoming" rounds={grouped.upcoming} empty="No upcoming rounds yet." />
        <RoundSection
          title="Completed"
          rounds={grouped.completed}
          empty="No completed rounds yet."
        />
      </div>
    </main>
  );
}

function RoundSection({ title, rounds, empty }: { title: string; rounds: Round[]; empty: string }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {rounds.length}
        </span>
      </div>
      {rounds.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}
