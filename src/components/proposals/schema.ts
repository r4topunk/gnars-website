import { isAddress } from "viem";
import { z } from "zod";

// Custom address validation
const addressSchema = z.string().refine((val) => isAddress(val), {
  message: "Invalid Ethereum address",
});

// Reusable numeric string validation
const numericString = <T extends z.ZodType<string | undefined>>(schema: T) => {
  return schema.refine(
    (val) => {
      if (!val) return true; // Allow optional empty strings
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num);
    },
    { message: "Must be a valid number" },
  );
};

const positiveNumericString = (schema = z.string()) => {
  return numericString(schema).refine(
    (val) => {
      if (!val) return true;
      return parseFloat(val) > 0;
    },
    { message: "Must be a positive number" },
  );
};

const positiveNumericStringOptional = (schema = z.string().optional()) => {
  return numericString(schema).refine(
    (val) => {
      if (!val) return true;
      return parseFloat(val) > 0;
    },
    { message: "Must be a positive number" },
  );
};

const nonNegativeNumericString = (schema = z.string()) => {
  return numericString(schema).refine(
    (val) => {
      if (!val) return true;
      return parseFloat(val) >= 0;
    },
    { message: "Must be a non-negative number" },
  );
};

const nonNegativeNumericStringOptional = (schema = z.string().optional()) => {
  return numericString(schema).refine(
    (val) => {
      if (!val) return true;
      return parseFloat(val) >= 0;
    },
    { message: "Must be a non-negative number" },
  );
};

// Custom hex validation for calldata
const hexSchema = z.string().refine((val) => /^0x[0-9a-fA-F]*$/.test(val), {
  message: "Must be valid hex string starting with 0x",
});

// Base transaction schema
const baseTransactionSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
});

// Send ETH transaction
export const sendEthTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-eth"),
  target: addressSchema,
  value: positiveNumericString(z.string().min(1, "Amount is required")),
});

// Send USDC transaction
export const sendUsdcTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-usdc"),
  recipient: addressSchema,
  amount: positiveNumericString(z.string().min(1, "Amount is required")),
});

// Send Tokens transaction
export const sendTokensTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-tokens"),
  tokenAddress: addressSchema,
  recipient: addressSchema,
  amount: positiveNumericString(z.string().min(1, "Amount is required")),
});

// Send NFTs transaction
export const sendNftsTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-nfts"),
  contractAddress: addressSchema,
  tokenId: nonNegativeNumericString(z.string().min(1, "Token ID is required")),
  from: addressSchema,
  to: addressSchema,
});

// Droposal transaction
export const droposalTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("droposal"),
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  description: z.string().min(1, "Description is required"),
  mediaUrl: z.string().min(1, "Media URL is required"),
  coverUrl: z.string().optional(),
  price: positiveNumericString(z.string().min(1, "Price is required")),
  editionType: z.enum(["fixed", "open"]),
  editionSize: positiveNumericStringOptional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  mintLimitPerAddress: positiveNumericStringOptional(),
  royaltyPercentage: nonNegativeNumericString(
    z.string().min(1, "Royalty percentage is required"),
  ).refine(
    (val) => {
      if (!val) return true;
      return parseFloat(val) <= 100;
    },
    { message: "Must be between 0 and 100" },
  ),
  payoutAddress: addressSchema,
  defaultAdmin: addressSchema,
  mediaType: z.string().optional(),
  coverType: z.string().optional(),
});

// Custom transaction
export const customTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("custom"),
  target: addressSchema,
  calldata: hexSchema,
  value: nonNegativeNumericStringOptional(),
});

// Discriminated union for all transaction types
export const transactionSchema = z.discriminatedUnion("type", [
  sendEthTransactionSchema,
  sendUsdcTransactionSchema,
  sendTokensTransactionSchema,
  sendNftsTransactionSchema,
  droposalTransactionSchema,
  customTransactionSchema,
]);

// Main proposal schema
export const proposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  bannerImage: z.string().optional(),
  transactions: z.array(transactionSchema).min(1, "At least one transaction is required"),
});

// Types
export type ProposalFormValues = z.infer<typeof proposalSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type SendEthTransaction = z.infer<typeof sendEthTransactionSchema>;
export type SendUsdcTransaction = z.infer<typeof sendUsdcTransactionSchema>;
export type SendTokensTransaction = z.infer<typeof sendTokensTransactionSchema>;
export type SendNftsTransaction = z.infer<typeof sendNftsTransactionSchema>;
export type DroposalTransaction = z.infer<typeof droposalTransactionSchema>;
export type CustomTransaction = z.infer<typeof customTransactionSchema>;
