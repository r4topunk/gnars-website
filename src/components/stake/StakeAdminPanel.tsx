"use client";

// Admin-only panel on /stake: deploy one Morpho V2 sponsorship vault per rider,
// signed by the connected EOA (a SOPA Safe owner). Self-hides for everyone else.
// Each deploy sends 3 wallet txs (split → vault → adapter) and proposes the
// config batch to the SOPA Safe; the rider's addresses are printed to paste
// into src/lib/gnars-vaults.ts.

import { useState } from "react";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RIDER_LIST, isVaultAdmin, type RiderId } from "@/lib/gnars-vaults";
import { useDeploySponsorshipVault, type DeployPhase, type DeployResult } from "@/hooks/use-deploy-sponsorship-vault";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const PHASE_LABEL: Record<DeployPhase, string> = {
  idle: "",
  split: "1/4 · deployando split…",
  vault: "2/4 · deployando vault…",
  adapter: "3/4 · deployando adapter…",
  propose: "4/4 · propondo no Safe…",
  done: "pronto",
  error: "erro",
};

export function StakeAdminPanel() {
  const activeAccount = useActiveAccount();
  const wallet = useActiveWallet();
  // The address that signs the Safe proposal must be a Safe OWNER (an EOA). When
  // the wallet is AA-wrapped the active account is a smart account, so prefer the
  // underlying admin EOA. Gate on either being an admin so the panel still shows
  // in smart-account view (the deploy hook grabs the EOA to sign regardless).
  const activeAddr = activeAccount?.address;
  const eoaAddr = wallet?.getAdminAccount?.()?.address;
  const admin = isVaultAdmin(eoaAddr) || isVaultAdmin(activeAddr);

  const { deploy, phase, error, isDeploying } = useDeploySponsorshipVault();
  const [activeId, setActiveId] = useState<RiderId | null>(null);
  const [results, setResults] = useState<Partial<Record<RiderId, DeployResult>>>({});

  // Nothing connected → stay invisible. Connected but not an admin → show a small
  // diagnostic (your own addresses only) so we can see why the gate rejected you.
  if (!activeAddr && !wallet) return null;
  if (!admin) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Painel de cofres (admin)</CardTitle>
          <CardDescription className="font-mono text-xs">
            conectado, mas sem permissão de admin.<br />
            ativo: {activeAddr ?? "—"}<br />
            eoa:&nbsp;&nbsp;&nbsp;{eoaAddr ?? "— (carteira não expõe EOA)"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function onDeploy(id: RiderId, wallet: string, existingSplit?: string) {
    setActiveId(id);
    const out = await deploy(wallet as `0x${string}`, id, existingSplit as `0x${string}` | undefined);
    if (out) {
      setResults((r) => ({ ...r, [id]: out }));
      toast.success(`Vault de ${id} deployado`, { description: "Aprove o batch no Safe da SOPA pra ativar." });
    } else {
      toast.error(`Falha no deploy de ${id}`);
    }
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/[0.03]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">ADMIN</Badge>
          <CardTitle>Cofres de patrocínio</CardTitle>
        </div>
        <CardDescription>
          Um vault Morpho por rider. Depósito rende na Moonwell; metade do rendimento vira fee e é dividida
          Gnars&nbsp;25% / atleta&nbsp;25% (o depositante fica com 50%). Owner = Safe da SOPA. Você assina o deploy
          e o batch — 1 das 2 confirmações do Safe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {RIDER_LIST.map((r) => {
          const done = results[r.id] ?? (r.vault ? ({ vault: r.vault, adapter: r.adapter, split: r.split } as DeployResult) : undefined);
          const busy = isDeploying && activeId === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{r.id}</span>
                    <span className="text-xs text-muted-foreground">@{r.handle}</span>
                    {done && <Badge variant="secondary" className="text-emerald-500">deployado</Badge>}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {r.wallet ? short(r.wallet) : "sem carteira cadastrada"}
                  </div>
                </div>
                {!done && r.wallet && (
                  <Button size="sm" disabled={isDeploying} onClick={() => onDeploy(r.id, r.wallet!, r.split)}>
                    {busy ? PHASE_LABEL[phase] : "Deploy vault"}
                  </Button>
                )}
                {!done && !r.wallet && (
                  <Badge variant="outline" className="text-muted-foreground">pendente</Badge>
                )}
              </div>

              {activeId === r.id && phase === "error" && error && (
                <p className="mt-2 text-xs text-destructive">{error}</p>
              )}

              {done && (
                <div className="mt-2 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                  <div>vault:&nbsp;&nbsp;{done.vault}</div>
                  <div>adapter: {done.adapter}</div>
                  <div>split:&nbsp;&nbsp;{done.split}</div>
                  {"queueUrl" in done && done.queueUrl && (
                    <a href={done.queueUrl} target="_blank" rel="noreferrer" className="text-yellow-500 underline">
                      aprovar batch no Safe →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(results).length > 0 && (
          <p className="pt-1 text-[11px] text-muted-foreground">
            Cole os endereços acima em <code>src/lib/gnars-vaults.ts</code> (campos vault/adapter/split do rider) pra
            ligar o patrocínio no /stake.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
