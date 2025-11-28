import { encodeFunctionData, parseEther, parseUnits } from "viem";
import { TransactionFormValues } from "@/components/proposals/schema";
import { TREASURY_TOKEN_ALLOWLIST, DROPOSAL_DEFAULT_MINT_LIMIT, DROPOSAL_TARGET, GNARS_ADDRESSES } from "@/lib/config";

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

        case "buy-coin":
          // Buy coin transactions store SDK-generated calldata
          // These fields are populated when the user saves the transaction
          if (tx.target && tx.calldata) {
            targets.push(tx.target as `0x${string}`);
            values.push(tx.value ? parseEther(tx.value) : BigInt(0));
            calldatas.push(tx.calldata as `0x${string}`);
          } else {
            console.error("Buy coin transaction missing SDK-generated data");
            targets.push("0x" as `0x${string}`);
            values.push(BigInt(0));
            calldatas.push("0x" as `0x${string}`);
          }
          break;

        case "custom":
          targets.push(tx.target as `0x${string}`);
          values.push(tx.value ? parseEther(tx.value) : BigInt(0));
          calldatas.push(tx.calldata as `0x${string}`);
          break;

        case "droposal":
          // Encode droposal using Zora's createEdition function via DROPOSAL_TARGET proxy
          targets.push(DROPOSAL_TARGET.base as `0x${string}`);
          values.push(BigInt(0));
          
          const droposalCalldata = encodeFunctionData({
            abi: [
              {
                inputs: [
                  { internalType: "string", name: "name", type: "string" },
                  { internalType: "string", name: "symbol", type: "string" },
                  { internalType: "uint64", name: "editionSize", type: "uint64" },
                  { internalType: "uint16", name: "royaltyBPS", type: "uint16" },
                  { internalType: "address payable", name: "fundsRecipient", type: "address" },
                  { internalType: "address", name: "defaultAdmin", type: "address" },
                  {
                    components: [
                      { internalType: "uint104", name: "publicSalePrice", type: "uint104" },
                      { internalType: "uint32", name: "maxSalePurchasePerAddress", type: "uint32" },
                      { internalType: "uint64", name: "publicSaleStart", type: "uint64" },
                      { internalType: "uint64", name: "publicSaleEnd", type: "uint64" },
                      { internalType: "uint64", name: "presaleStart", type: "uint64" },
                      { internalType: "uint64", name: "presaleEnd", type: "uint64" },
                      { internalType: "bytes32", name: "presaleMerkleRoot", type: "bytes32" },
                    ],
                    internalType: "struct IERC721Drop.SalesConfiguration",
                    name: "saleConfig",
                    type: "tuple",
                  },
                  { internalType: "string", name: "description", type: "string" },
                  { internalType: "string", name: "animationURI", type: "string" },
                  { internalType: "string", name: "imageURI", type: "string" },
                ],
                name: "createEdition",
                outputs: [{ internalType: "address", name: "", type: "address" }],
                stateMutability: "nonpayable",
                type: "function",
              },
            ],
            functionName: "createEdition",
            args: [
              tx.name,
              tx.symbol,
              BigInt(tx.editionSize || "18446744073709551615"),
              Number(tx.royaltyPercentage || "5000"),
              (tx.payoutAddress || GNARS_ADDRESSES.treasury) as `0x${string}`,
              tx.defaultAdmin as `0x${string}`,
              {
                publicSalePrice: parseEther(tx.price || "0"),
                maxSalePurchasePerAddress: DROPOSAL_DEFAULT_MINT_LIMIT, // Hardcoded to 1,000,000 (effectively unlimited)
                publicSaleStart: tx.startTime ? BigInt(Math.floor(new Date(tx.startTime).getTime() / 1000)) : BigInt(0),
                publicSaleEnd: tx.endTime ? BigInt(Math.floor(new Date(tx.endTime).getTime() / 1000)) : BigInt("18446744073709551615"),
                presaleStart: BigInt(0),
                presaleEnd: BigInt(0),
                presaleMerkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
              },
              tx.collectionDescription || "",
              tx.animationUri || "",
              tx.imageUri || "",
            ],
          });
          
          calldatas.push(droposalCalldata);
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
