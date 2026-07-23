"use client";

// Who's backing the picked rider. Positions come from the vault's own share
// ledger, so the numbers are the contract's, not a cached index.

import { Users2 } from "lucide-react";
import type { Address } from "viem";
import { useVaultSupporters } from "@/hooks/use-vault-supporters";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 })}`;

export function VaultSupporters({
  vault,
  feeRecipient,
  riderName,
  /** The connected account, so "you" is called out in the list. */
  you,
}: {
  vault?: Address;
  feeRecipient?: Address;
  riderName: string;
  you?: string | null;
}) {
  const supporters = useVaultSupporters(vault, feeRecipient);

  if (!vault) return null;
  if (supporters === null) {
    return (
      <div className="rounded-[22px] border border-white/[0.06] bg-[#0e0b09]/60 p-6 text-sm text-white/40">
        carregando apoiadores…
      </div>
    );
  }

  const backers = supporters.filter((s) => !s.isFeeRecipient);
  const fee = supporters.find((s) => s.isFeeRecipient);

  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410]/85 to-[#0e0b09]/85 p-6 sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
            <Users2 className="h-4 w-4 text-[#f7c948]" /> Quem está apoiando
          </p>
          <p className="mt-1.5 text-sm text-white/60">
            O principal continua de quem depositou — o que é dividido é só o rendimento.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            {backers.length === 1 ? "apoiador" : "apoiadores"}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-white">{backers.length}</p>
        </div>
      </div>

      {backers.length === 0 ? (
        <p className="text-sm text-white/50">
          Ninguém apoiando {riderName} ainda — seja o primeiro.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {backers.map((s) => {
            const isYou = !!you && s.address.toLowerCase() === you.toLowerCase();
            return (
              <div
                key={s.address}
                className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 sm:grid-cols-[1fr_140px_auto]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm text-white/90">
                      {short(s.address)}
                    </span>
                    {isYou && (
                      <span className="rounded-md bg-[#f7c948]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f7c948]">
                        você
                      </span>
                    )}
                  </div>
                </div>
                {/* share bar — desktop only */}
                <div className="hidden items-center gap-2.5 sm:flex">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(s.share * 100, 2)}%`,
                        backgroundImage: "linear-gradient(90deg,#f7c948,#f5851f)",
                      }}
                    />
                  </div>
                  <span className="min-w-[34px] text-xs font-semibold text-white/60">
                    {Math.round(s.share * 100)}%
                  </span>
                </div>
                <span className="text-right font-mono text-base font-bold tabular-nums text-white">
                  {usd(s.assets)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {fee && fee.assets > 0 && (
        <p className="mt-4 text-xs text-white/45">
          <span className="font-mono font-semibold text-[#f7c948]">{usd(fee.assets)}</span> de
          rendimento já acumulado pra dividir entre a Gnars e {riderName} — não sai do principal de
          ninguém.
        </p>
      )}
    </div>
  );
}
