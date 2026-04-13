"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { prepareTransaction } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveAccount, useActiveWallet, useSendTransaction } from "thirdweb/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";
import { useUserAddress } from "@/hooks/use-user-address";
import { getThirdwebClient } from "@/lib/thirdweb";

export default function ThirdwebSpikePage() {
  const wagmi = useAccount();
  const bridge = useThirdwebWallet();
  const unified = useUserAddress();
  const thirdwebAccount = useActiveAccount();
  const thirdwebWallet = useActiveWallet();
  const thirdwebChainId = thirdwebWallet?.getChain()?.id;

  const sendTx = useSendTransaction();
  const client = getThirdwebClient();
  const clientReady = Boolean(client);

  const canSend = Boolean(
    client && thirdwebAccount && thirdwebChainId === base.id && !sendTx.isPending,
  );

  const handleSend = () => {
    if (!client || !thirdwebAccount) return;

    const tx = prepareTransaction({
      chain: base,
      to: thirdwebAccount.address,
      value: 0n,
      client,
    });

    sendTx.mutate(tx);
  };

  return (
    <main className="container mx-auto max-w-3xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Thirdweb Spike</h1>
        <p className="text-muted-foreground text-sm">
          Validates the wagmi-reads + thirdweb-writes hybrid pattern. Connect a wallet via the
          normal header flow, then use this page to compare wagmi and thirdweb state and send a
          test transaction through the thirdweb layer.
        </p>
      </header>

      {clientReady ? null : (
        <Alert variant="destructive">
          <AlertTitle>Thirdweb client not configured</AlertTitle>
          <AlertDescription>
            Set <code>NEXT_PUBLIC_THIRDWEB_CLIENT_ID</code> in <code>.env.local</code>. Get a
            client ID from{" "}
            <Link
              className="underline underline-offset-2"
              href="https://thirdweb.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              thirdweb.com/dashboard
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Wagmi state</CardTitle>
          <CardDescription>Source of truth for the EOA connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm">
          <Row label="isConnected" value={String(wagmi.isConnected)} />
          <Row label="address" value={wagmi.address ?? "(none)"} />
          <Row label="chainId" value={wagmi.chainId?.toString() ?? "(none)"} />
          <Row label="connector" value={wagmi.connector?.name ?? "(none)"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thirdweb bridge state</CardTitle>
          <CardDescription>
            Created by wrapping the wagmi connector&apos;s EIP-1193 provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm">
          <Row label="isSyncing" value={String(bridge.isSyncing)} />
          <Row label="bridge.error" value={bridge.error ?? "(none)"} />
          <Row label="thirdweb address" value={thirdwebAccount?.address ?? "(none)"} />
          <Row label="thirdweb chain" value={thirdwebChainId?.toString() ?? "(none)"} />
          <Row label="wallet.id" value={thirdwebWallet?.id ?? "(none)"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unified address</CardTitle>
          <CardDescription>
            What future read hooks should use when querying &quot;the user&apos;s stuff&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-sm">
          <Row label="address" value={unified.address ?? "(none)"} />
          <Row label="source" value={unified.source ?? "(none)"} />
          <Row label="isConnected" value={String(unified.isConnected)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send test transaction</CardTitle>
          <CardDescription>
            0 ETH self-transfer via thirdweb&apos;s useSendTransaction on Base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleSend} disabled={!canSend}>
            {sendTx.isPending ? "Sending..." : "Send 0 ETH to self"}
          </Button>

          {sendTx.data ? (
            <p className="text-sm">
              Tx hash:{" "}
              <Link
                className="font-mono underline underline-offset-2"
                href={`https://basescan.org/tx/${sendTx.data.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {sendTx.data.transactionHash.slice(0, 10)}...
                {sendTx.data.transactionHash.slice(-8)}
              </Link>
            </p>
          ) : null}

          {sendTx.error ? (
            <Alert variant="destructive">
              <AlertTitle>Send failed</AlertTitle>
              <AlertDescription className="break-words">
                {sendTx.error.message}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
