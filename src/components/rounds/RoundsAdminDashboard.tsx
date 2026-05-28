"use client";

import { useState } from "react";
import { ArrowLeft, Database, ShieldCheck } from "lucide-react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { isRoundAdminAddress } from "@/features/rounds/admin";
import { createRoundActionMessage } from "@/features/rounds/signature";
import { getRoundState } from "@/features/rounds/state";
import type { Round, RoundRequest } from "@/features/rounds/types";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link } from "@/i18n/navigation";

type RequestsState = "idle" | "loading" | "loaded" | "error";

export function RoundsAdminDashboard({
  rounds,
  databaseConfigured,
}: {
  rounds: Round[];
  databaseConfigured: boolean;
}) {
  const { address, adminAddress, isConnected, isInAppWallet } = useUserAddress();
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const connectedAdminAddress = adminAddress ?? address;
  const isAdmin = isRoundAdminAddress(connectedAdminAddress);

  const [requests, setRequests] = useState<RoundRequest[]>([]);
  const [requestsState, setRequestsState] = useState<RequestsState>("idle");
  const [requestsError, setRequestsError] = useState("");

  const loadRequests = async () => {
    if (!connectedAdminAddress) return;
    // Sign with the admin EOA for external wallets (the allowlist is keyed by
    // EOA); in-app sessions fall back to the smart account.
    const signer = (!isInAppWallet ? wallet?.getAdminAccount?.() : undefined) ?? account;
    if (!signer) return;

    setRequestsState("loading");
    setRequestsError("");

    try {
      const path = "/api/rounds/admin/requests";
      const issuedAt = new Date().toISOString();
      const message = createRoundActionMessage({
        action: "admin",
        method: "POST",
        path,
        walletAddress: connectedAdminAddress,
        payload: { walletAddress: connectedAdminAddress },
        issuedAt,
      });
      const signature = await signer.signMessage({ message });
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedAdminAddress, issuedAt, signature }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load round requests.");

      setRequests((result.requests as RoundRequest[]) ?? []);
      setRequestsState("loaded");
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : "Unable to load round requests.");
      setRequestsState("error");
    }
  };

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
                Review live rounds and database status. Round requests contain requester contact
                details and are loaded only after an approved admin wallet signs in — they are never
                sent to unapproved visitors.
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
          <>
            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold tracking-tight">Round requests</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadRequests}
                  disabled={requestsState === "loading"}
                >
                  {requestsState === "loading"
                    ? "Verifying..."
                    : requestsState === "loaded"
                      ? "Refresh"
                      : "Load round requests"}
                </Button>
              </div>
              <div className="divide-y divide-border">
                {requestsState === "error" ? (
                  <div className="p-5 text-sm text-destructive">{requestsError}</div>
                ) : requestsState === "idle" ? (
                  <div className="p-5 text-sm text-muted-foreground">
                    Sign with your admin wallet to load round requests.
                  </div>
                ) : requestsState === "loaded" && requests.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">No round requests found.</div>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{request.title}</div>
                        <div className="mt-1 truncate text-sm text-muted-foreground">
                          /{request.requestedSlug} by {request.requesterName}
                        </div>
                      </div>
                      <div className="text-sm capitalize text-muted-foreground">
                        {request.status}
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={`mailto:${request.requesterEmail}`}>Email</a>
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>

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
          </>
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
