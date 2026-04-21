import { decodeFunctionData, parseEther } from "viem";
import { describe, expect, it } from "vitest";
import type { TransactionFormValues } from "@/components/proposals/schema";
import {
  DAO_ADDRESSES,
  DROPOSAL_DEFAULT_MINT_LIMIT,
  DROPOSAL_TARGET,
  TREASURY_TOKEN_ALLOWLIST,
} from "./config";
import { encodeTransactions } from "./proposal-utils";

const RECIPIENT = "0x000000000000000000000000000000000000dEaD" as const;
const TOKEN = "0xBa5B9B2D2d06a9021EB3190ea5Fb0e02160839A4" as const;
const FROM = "0x1111111111111111111111111111111111111111" as const;
const TO = "0x2222222222222222222222222222222222222222" as const;
const ADMIN = "0x3333333333333333333333333333333333333333" as const;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ERC721_TRANSFER_FROM_ABI = [
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

describe("encodeTransactions", () => {
  describe("send-eth", () => {
    it("encodes a simple ETH transfer", () => {
      const tx: TransactionFormValues = {
        type: "send-eth",
        target: RECIPIENT,
        value: "1.5",
      };

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets).toEqual([RECIPIENT]);
      expect(values).toEqual([parseEther("1.5")]);
      expect(calldatas).toEqual(["0x"]);
    });

    it("treats missing value as zero", () => {
      const tx = {
        type: "send-eth",
        target: RECIPIENT,
        value: "",
      } as unknown as TransactionFormValues;

      const { values } = encodeTransactions([tx]);

      expect(values[0]).toBe(0n);
    });
  });

  describe("send-usdc", () => {
    it("always targets the treasury USDC address, not the recipient", () => {
      const tx: TransactionFormValues = {
        type: "send-usdc",
        recipient: RECIPIENT,
        amount: "100",
      };

      const { targets, values } = encodeTransactions([tx]);

      expect(targets[0].toLowerCase()).toBe(TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase());
      expect(values[0]).toBe(0n);
    });

    it("encodes amount with 6 decimals (USDC)", () => {
      const tx: TransactionFormValues = {
        type: "send-usdc",
        recipient: RECIPIENT,
        amount: "100",
      };

      const { calldatas } = encodeTransactions([tx]);
      const { args } = decodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        data: calldatas[0],
      });

      expect(args[0].toLowerCase()).toBe(RECIPIENT.toLowerCase());
      expect(args[1]).toBe(100_000_000n); // 100 * 10^6
    });

    it("handles fractional USDC amounts", () => {
      const tx: TransactionFormValues = {
        type: "send-usdc",
        recipient: RECIPIENT,
        amount: "0.5",
      };

      const { calldatas } = encodeTransactions([tx]);
      const { args } = decodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        data: calldatas[0],
      });

      expect(args[1]).toBe(500_000n); // 0.5 * 10^6
    });
  });

  describe("send-tokens", () => {
    it("targets the provided token address and encodes with 18 decimals", () => {
      const tx: TransactionFormValues = {
        type: "send-tokens",
        tokenAddress: TOKEN,
        recipient: RECIPIENT,
        amount: "2",
      };

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets[0]).toBe(TOKEN);
      expect(values[0]).toBe(0n);

      const { args } = decodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        data: calldatas[0],
      });
      expect(args[0].toLowerCase()).toBe(RECIPIENT.toLowerCase());
      expect(args[1]).toBe(2n * 10n ** 18n);
    });
  });

  describe("send-nfts", () => {
    it("encodes transferFrom with from/to/tokenId", () => {
      const tx: TransactionFormValues = {
        type: "send-nfts",
        contractAddress: TOKEN,
        from: FROM,
        to: TO,
        tokenId: "42",
      };

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets[0]).toBe(TOKEN);
      expect(values[0]).toBe(0n);

      const { args, functionName } = decodeFunctionData({
        abi: ERC721_TRANSFER_FROM_ABI,
        data: calldatas[0],
      });
      expect(functionName).toBe("transferFrom");
      expect(args[0].toLowerCase()).toBe(FROM.toLowerCase());
      expect(args[1].toLowerCase()).toBe(TO.toLowerCase());
      expect(args[2]).toBe(42n);
    });
  });

  describe("custom", () => {
    it("passes through target, value, and calldata verbatim", () => {
      const tx: TransactionFormValues = {
        type: "custom",
        target: RECIPIENT,
        value: "0.25",
        calldata: "0xdeadbeef",
      };

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets).toEqual([RECIPIENT]);
      expect(values).toEqual([parseEther("0.25")]);
      expect(calldatas).toEqual(["0xdeadbeef"]);
    });
  });

  describe("buy-coin", () => {
    it("passes through SDK-generated fields when present", () => {
      const tx = {
        type: "buy-coin",
        coinAddress: TOKEN,
        ethAmount: "0.1",
        slippage: "1",
        target: RECIPIENT,
        value: "0.1",
        calldata: "0xfeedface",
      } as unknown as TransactionFormValues;

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets).toEqual([RECIPIENT]);
      expect(values).toEqual([parseEther("0.1")]);
      expect(calldatas).toEqual(["0xfeedface"]);
    });

    it("emits an empty placeholder when SDK data is missing", () => {
      const tx = {
        type: "buy-coin",
        coinAddress: TOKEN,
        ethAmount: "0.1",
        slippage: "1",
      } as unknown as TransactionFormValues;

      const { targets, values, calldatas } = encodeTransactions([tx]);

      expect(targets).toEqual(["0x"]);
      expect(values).toEqual([0n]);
      expect(calldatas).toEqual(["0x"]);
    });
  });

  describe("droposal", () => {
    it("targets DROPOSAL_TARGET.base with zero value", () => {
      const tx: TransactionFormValues = {
        type: "droposal",
        name: "Test",
        symbol: "TST",
        collectionDescription: "desc",
        price: "0.01",
        defaultAdmin: ADMIN,
      };

      const { targets, values } = encodeTransactions([tx]);

      expect(targets[0].toLowerCase()).toBe(DROPOSAL_TARGET.base.toLowerCase());
      expect(values[0]).toBe(0n);
    });

    it("defaults payoutAddress to the DAO treasury when omitted", () => {
      const tx: TransactionFormValues = {
        type: "droposal",
        name: "Test",
        symbol: "TST",
        collectionDescription: "desc",
        price: "0.01",
        defaultAdmin: ADMIN,
      };

      const createEditionAbi = [
        {
          type: "function",
          name: "createEdition",
          stateMutability: "nonpayable",
          inputs: [
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
            { name: "editionSize", type: "uint64" },
            { name: "royaltyBPS", type: "uint16" },
            { name: "fundsRecipient", type: "address" },
            { name: "defaultAdmin", type: "address" },
            {
              name: "saleConfig",
              type: "tuple",
              components: [
                { name: "publicSalePrice", type: "uint104" },
                { name: "maxSalePurchasePerAddress", type: "uint32" },
                { name: "publicSaleStart", type: "uint64" },
                { name: "publicSaleEnd", type: "uint64" },
                { name: "presaleStart", type: "uint64" },
                { name: "presaleEnd", type: "uint64" },
                { name: "presaleMerkleRoot", type: "bytes32" },
              ],
            },
            { name: "description", type: "string" },
            { name: "animationURI", type: "string" },
            { name: "imageURI", type: "string" },
          ],
          outputs: [{ name: "", type: "address" }],
        },
      ] as const;

      const { calldatas } = encodeTransactions([tx]);
      const { args } = decodeFunctionData({
        abi: createEditionAbi,
        data: calldatas[0],
      });

      // args: [name, symbol, editionSize, royaltyBPS, fundsRecipient, defaultAdmin, saleConfig, ...]
      expect(args[4].toLowerCase()).toBe(DAO_ADDRESSES.treasury.toLowerCase());
      expect(args[5].toLowerCase()).toBe(ADMIN.toLowerCase());

      const saleConfig = args[6] as {
        publicSalePrice: bigint;
        maxSalePurchasePerAddress: number;
      };
      expect(saleConfig.publicSalePrice).toBe(parseEther("0.01"));
      expect(saleConfig.maxSalePurchasePerAddress).toBe(DROPOSAL_DEFAULT_MINT_LIMIT);
    });
  });

  describe("error handling", () => {
    // Known bug: when encoding throws mid-case (e.g. parseEther fails after
    // targets.push already ran), the catch block pushes placeholders to every
    // array — desyncing lengths. A downstream good transaction then encodes
    // into mismatched indices. Not fixed here; tracked as a follow-up.
    it.todo("should keep targets/values/calldatas arrays in sync when a case throws mid-push");

    it("emits a placeholder for an unknown transaction type", () => {
      const weird = {
        type: "not-a-real-type",
      } as unknown as TransactionFormValues;

      const { targets, values, calldatas } = encodeTransactions([weird]);

      expect(targets).toEqual(["0x"]);
      expect(values).toEqual([0n]);
      expect(calldatas).toEqual(["0x"]);
    });
  });

  it("preserves order and length across mixed transactions", () => {
    const txs: TransactionFormValues[] = [
      { type: "send-eth", target: RECIPIENT, value: "1" },
      { type: "send-usdc", recipient: RECIPIENT, amount: "50" },
      {
        type: "custom",
        target: RECIPIENT,
        value: "0",
        calldata: "0xabcdef",
      },
    ];

    const { targets, values, calldatas } = encodeTransactions(txs);

    expect(targets).toHaveLength(3);
    expect(values).toHaveLength(3);
    expect(calldatas).toHaveLength(3);
    expect(targets[0]).toBe(RECIPIENT);
    expect(targets[1].toLowerCase()).toBe(TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase());
    expect(calldatas[2]).toBe("0xabcdef");
  });
});
