import { encodeFunctionData, parseEther, parseUnits } from "viem";
import { TransactionFormValues } from "@/components/proposals/schema";
import { TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

export function encodeTransactions(transactions: TransactionFormValues[]) {
  const targets: `0x${string}`[] = [];
  const values: bigint[] = [];
  const calldatas: `0x${string}`[] = [];

  for (const tx of transactions) {
    try {
      switch (tx.type) {
        case "send-eth":
          targets.push(tx.target as `0x${string}`);
          values.push(parseEther(tx.value || "0"));
          calldatas.push("0x" as `0x${string}`);
          break;

        case "send-usdc":
          targets.push(TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`);
          values.push(BigInt(0));
          const usdcCalldata = encodeFunctionData({
            abi: [
              {
                name: "transfer",
                type: "function",
                inputs: [
                  { name: "to", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
              },
            ],
            functionName: "transfer",
            args: [tx.recipient, parseUnits(tx.amount || "0", 6)], // USDC has 6 decimals
          });
          calldatas.push(usdcCalldata);
          break;

        case "send-tokens":
          targets.push(tx.tokenAddress as `0x${string}`);
          values.push(BigInt(0));
          // TODO: Fetch token decimals on-chain or add a field to the form
          const tokenCalldata = encodeFunctionData({
            abi: [
              {
                name: "transfer",
                type: "function",
                inputs: [
                  { name: "to", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
              },
            ],
            functionName: "transfer",
            args: [tx.recipient, parseUnits(tx.amount || "0", 18)], // Assuming 18 decimals for generic ERC-20
          });
          calldatas.push(tokenCalldata);
          break;

        case "send-nfts":
          targets.push(tx.contractAddress as `0x${string}`);
          values.push(BigInt(0));
          const nftCalldata = encodeFunctionData({
            abi: [
              {
                name: "transferFrom",
                type: "function",
                inputs: [
                  { name: "from", type: "address" },
                  { name: "to", type: "address" },
                  { name: "tokenId", type: "uint256" },
                ],
              },
            ],
            functionName: "transferFrom",
            args: [tx.from, tx.to, BigInt(tx.tokenId || "0")],
          });
          calldatas.push(nftCalldata);
          break;

        case "custom":
          targets.push(tx.target as `0x${string}`);
          values.push(tx.value ? parseEther(tx.value) : BigInt(0));
          calldatas.push(tx.calldata as `0x${string}`);
          break;

        case "droposal":
          // TODO: Implement droposal transaction encoding
          console.warn("Droposal transaction encoding not yet implemented");
          targets.push("0x" as `0x${string}`);
          values.push(BigInt(0));
          calldatas.push("0x" as `0x${string}`);
          break;

        default:
          console.error("Unknown transaction type");
          targets.push("0x" as `0x${string}`);
          values.push(BigInt(0));
          calldatas.push("0x" as `0x${string}`);
      }
    } catch (error) {
      console.error(`Error encoding transaction ${(tx as TransactionFormValues).type}:`, error);
      // Add empty transaction to maintain array length
      targets.push("0x" as `0x${string}`);
      values.push(BigInt(0));
      calldatas.push("0x" as `0x${string}`);
    }
  }

  return { targets, values, calldatas };
}
