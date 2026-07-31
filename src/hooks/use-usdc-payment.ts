"use client";

import { useCallback, useState } from "react";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { parseUnits, type Address, type Hex } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { STORE_CHECKOUT } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";

/**
 * Pay a fixed USDC amount on Base to a recipient and wait for the receipt.
 *
 * Used by the /store checkout to collect the retail price before an order is forwarded to
 * KeepKey. Signs via `useWriteAccount()` so it respects the user's EOA/SA view mode, like
 * every other write in the app.
 *
 * Returns the **real on-chain transaction hash from the receipt**, not the hash
 * `sendTransaction` returns. For smart-account (AA) payers that hash is the userOp hash,
 * which the server can't verify with plain viem — using the receipt's `transactionHash`
 * yields the actual mined tx for both EOA and SA, so server-side verification works.
 */
export function useUsdcPayment() {
  const writer = useWriteAccount();
  const [isPaying, setIsPaying] = useState(false);

  const pay = useCallback(
    async ({ to, amountUsd }: { to: Address; amountUsd: number }): Promise<Hex> => {
      const client = getThirdwebClient();
      if (!client) throw new Error("Wallet client not configured");
      if (!writer) throw new Error("Connect your wallet first");

      setIsPaying(true);
      try {
        await ensureOnChain(writer.wallet, base);

        const usdc = getContract({ client, chain: base, address: STORE_CHECKOUT.usdc });
        const tx = prepareContractCall({
          contract: usdc,
          method: "function transfer(address to, uint256 amount) returns (bool)",
          params: [to, parseUnits(amountUsd.toString(), STORE_CHECKOUT.usdcDecimals)],
        });

        const { transactionHash } = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        // The receipt carries the real mined tx hash — for AA this differs from the userOp
        // hash above, and it's what the server verifies against on-chain.
        const receipt = await waitForReceipt({ client, chain: base, transactionHash });
        return receipt.transactionHash as Hex;
      } finally {
        setIsPaying(false);
      }
    },
    [writer],
  );

  return { pay, isPaying, canPay: Boolean(writer) };
}
