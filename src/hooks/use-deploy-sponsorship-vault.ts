"use client";

// Admin-only: deploy one athlete's sponsorship vault end-to-end from the
// browser, signed by the connected EOA (which must be a SOPA Safe owner).
//
//   1. deploy 0xSplits PullSplit (Gnars 50 / athlete 50)   — wallet tx
//   2. deploy Morpho V2 vault (owner = SOPA Safe)           — wallet tx
//   3. deploy MorphoVaultV1Adapter (→ Moonwell)             — wallet tx
//   4. propose the config MultiSend to the SOPA Safe        — EOA signs, POST
//
// The 3 deploys are permissionless (any funded EOA); the vault owner is the
// Safe regardless. The config is curator/allocator-gated, so it goes into one
// Safe proposal — and because the connected EOA is a Safe owner, proposing also
// lands the first of the two required confirmations. No server key involved.

import { useCallback, useState } from "react";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import {
  encodeFunctionData, hashTypedData, parseEventLogs, toHex, keccak256, zeroAddress,
  type Address, type Hex,
} from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { getThirdwebClient } from "@/lib/thirdweb";
import {
  CHAIN_ID, SOPA_SAFE, USDC, MOONWELL_USDC, VAULT_V2_FACTORY, ADAPTER_FACTORY,
  PULL_SPLIT_FACTORY, MULTISEND_CALL_ONLY, SAFE_TX_SERVICE, SAFE_TX_TYPES,
  vaultFactoryAbi, adapterFactoryAbi, splitFactoryAbi, splitParamsFor,
  buildConfigCalls, encodeMultiSend, nextSafeNonce, safeQueueUrl, type SafeCall,
} from "@/lib/sponsorship-vaults";

export type DeployPhase = "idle" | "split" | "vault" | "adapter" | "propose" | "done" | "error";

export type DeployResult = {
  split: Address;
  vault: Address;
  adapter: Address;
  safeTxHash: Hex;
  nonce: number;
  queueUrl: string;
};

const multiSendAbi = [{
  name: "multiSend", type: "function", stateMutability: "payable",
  inputs: [{ name: "transactions", type: "bytes" }], outputs: [],
}] as const;

export function useDeploySponsorshipVault() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<DeployPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeployResult | null>(null);

  const deploy = useCallback(
    async (athlete: Address, handle: string, existingSplit?: Address): Promise<DeployResult | null> => {
      const client = getThirdwebClient();
      if (!client) { setError("Thirdweb client não configurado."); setPhase("error"); return null; }
      if (!writer) { setError("Conecte a carteira."); setPhase("error"); return null; }
      // The Safe proposal must be signed by a SOPA Safe OWNER (an EOA), not a
      // thirdweb smart account. Grab the underlying admin EOA when the wallet is
      // AA-wrapped; for a plain injected wallet writer.account already is it.
      const account = writer.wallet.getAdminAccount?.() ?? writer.account;
      setError(null);
      setResult(null);

      try {
        await ensureOnChain(writer.wallet, base);

        // 1. split — reuse the rider's already-deployed split when the config
        // carries one, so retrying after a partial run doesn't orphan another
        // split contract (and doesn't cost another signature).
        let split = existingSplit;
        if (!split) {
          setPhase("split");
          const splitData = encodeFunctionData({
            abi: splitFactoryAbi, functionName: "createSplit",
            args: [splitParamsFor(athlete), SOPA_SAFE, account.address as Address],
          });
          const splitTx = prepareTransaction({ client, chain: base, to: PULL_SPLIT_FACTORY, data: splitData });
          const splitHash = (await sendTransaction({ account, transaction: splitTx })).transactionHash;
          const splitReceipt = await waitForReceipt({ client, chain: base, transactionHash: splitHash });
          split = parseEventLogs({ abi: splitFactoryAbi, eventName: "SplitCreated", logs: splitReceipt.logs })[0]
            ?.args.split as Address | undefined;
          if (!split) throw new Error("Não achei o endereço do split no recibo.");
        }

        // 2. vault ---------------------------------------------------------
        setPhase("vault");
        const salt = keccak256(toHex(`gnars-sponsor-${handle}-${Date.now()}`));
        const vaultData = encodeFunctionData({
          abi: vaultFactoryAbi, functionName: "createVaultV2", args: [SOPA_SAFE, USDC, salt],
        });
        const vaultTx = prepareTransaction({ client, chain: base, to: VAULT_V2_FACTORY, data: vaultData });
        const vaultHash = (await sendTransaction({ account, transaction: vaultTx })).transactionHash;
        const vaultReceipt = await waitForReceipt({ client, chain: base, transactionHash: vaultHash });
        const vault = parseEventLogs({ abi: vaultFactoryAbi, eventName: "CreateVaultV2", logs: vaultReceipt.logs })[0]
          ?.args.newVaultV2 as Address | undefined;
        if (!vault) throw new Error("Não achei o endereço do vault no recibo.");

        // 3. adapter -------------------------------------------------------
        setPhase("adapter");
        const adapterData = encodeFunctionData({
          abi: adapterFactoryAbi, functionName: "createMorphoVaultV1Adapter", args: [vault, MOONWELL_USDC],
        });
        const adapterTx = prepareTransaction({ client, chain: base, to: ADAPTER_FACTORY, data: adapterData });
        const adapterHash = (await sendTransaction({ account, transaction: adapterTx })).transactionHash;
        const adapterReceipt = await waitForReceipt({ client, chain: base, transactionHash: adapterHash });
        const adapter = parseEventLogs({ abi: adapterFactoryAbi, eventName: "CreateMorphoVaultV1Adapter", logs: adapterReceipt.logs })[0]
          ?.args.morphoVaultV1Adapter as Address | undefined;
        if (!adapter) throw new Error("Não achei o endereço do adapter no recibo.");

        // 4. propose config batch to the SOPA Safe -------------------------
        setPhase("propose");
        const calls: SafeCall[] = buildConfigCalls(vault, adapter, split);
        const msData = encodeFunctionData({ abi: multiSendAbi, functionName: "multiSend", args: [encodeMultiSend(calls)] });
        const nonce = await nextSafeNonce(SOPA_SAFE);
        const message = {
          to: MULTISEND_CALL_ONLY, value: 0n, data: msData, operation: 1,
          safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: zeroAddress, refundReceiver: zeroAddress,
          nonce: BigInt(nonce),
        } as const;
        const domain = { chainId: CHAIN_ID, verifyingContract: SOPA_SAFE } as const;
        const safeTxHash = hashTypedData({ domain, types: SAFE_TX_TYPES, primaryType: "SafeTx", message });
        const signature = await account.signTypedData({ domain, types: SAFE_TX_TYPES, primaryType: "SafeTx", message });

        const res = await fetch(`${SAFE_TX_SERVICE}/api/v1/safes/${SOPA_SAFE}/multisig-transactions/`, {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: MULTISEND_CALL_ONLY, value: "0", data: msData, operation: 1,
            safeTxGas: "0", baseGas: "0", gasPrice: "0", gasToken: zeroAddress, refundReceiver: zeroAddress,
            nonce, contractTransactionHash: safeTxHash, sender: account.address, signature,
            origin: `Gnars sponsorship vault · ${handle}`,
          }),
        });
        if (!res.ok) throw new Error(`Safe API HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);

        const out: DeployResult = { split, vault, adapter, safeTxHash, nonce, queueUrl: safeQueueUrl(SOPA_SAFE) };
        setResult(out);
        setPhase("done");
        return out;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no deploy.");
        setPhase("error");
        return null;
      }
    },
    [writer],
  );

  return { deploy, phase, error, result, isDeploying: phase !== "idle" && phase !== "done" && phase !== "error" };
}
