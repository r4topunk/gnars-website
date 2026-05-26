"use client";

import { ArrowLeft, Database, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isRoundAdminAddress } from "@/features/rounds/admin";
import { getRoundState } from "@/features/rounds/state";
import type { Round } from "@/features/rounds/types";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";

export function RoundsAdminDashboard({
  rounds,
  databaseConfigured,
}: {
  rounds: Round[];
  databaseConfigured: boolean;
}) {
  const { address, adminAddress, isConnected } = useUserAddress();
  const connectedAdminAddress = adminAddress ?? address;
  const isAdmin = isRoundAdminAddress(connectedAdminAddress);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/rounds">
            <ArrowLeft className="size-4" />
            Back to rounds
          </Link>
        </Button>

        <section className="rounded-lg border border-border bg-muted/30 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck className="size-4" />
                Admin
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Rounds Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review live rounds and database status. Creation and moderation APIs are
                intentionally kept server-side; this page exposes the admin entry point without
                showing controls to unapproved wallets.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <Database className="size-4 text-muted-foreground" />
              {databaseConfigured ? "Database connected" : "Database not configured"}
            </div>
          </div>
        </section>

        {!isConnected ? (
          <AdminNotice
            title="Connect wallet"
            body="Connect an approved admin wallet to view this dashboard."
          />
        ) : !isAdmin ? (
          <AdminNotice
            title="Not authorized"
            body="This wallet is not on the approved Rounds admin list."
          />
        ) : (
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold tracking-tight">Rounds</h2>
            </div>
            <div className="divide-y divide-border">
              {rounds.length > 0 ? (
                rounds.map((round) => (
                  <div
                    key={round.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{round.title}</div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">
                        /{round.slug}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{getRoundState(round)}</div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/rounds/${round.slug}`}>View</Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="p-5 text-sm text-muted-foreground">No rounds found.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function AdminNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
