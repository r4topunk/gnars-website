import { z } from "zod";
import { isAddress } from "viem";

// Custom address validation
const addressSchema = z.string().refine((val) => isAddress(val), {
  message: "Invalid Ethereum address",
});

// Custom positive number validation for string inputs
const positiveNumberString = z.string().refine((val) => {
  const num = parseFloat(val);
  return !isNaN(num) && num > 0;
}, {
  message: "Must be a positive number",
});

// Custom optional positive number validation
const optionalPositiveNumberString = z.string().optional().refine((val) => {
  if (!val) return true; // Allow empty
  const num = parseFloat(val);
  return !isNaN(num) && num > 0;
}, {
  message: "Must be a positive number or empty",
});

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
  value: z.string().min(1, "Amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive amount"),
});

// Send USDC transaction
export const sendUsdcTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-usdc"),
  recipient: addressSchema,
  amount: positiveNumberString,
});

// Send Tokens transaction
export const sendTokensTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-tokens"),
  tokenAddress: addressSchema,
  recipient: addressSchema,
  amount: positiveNumberString,
});

// Send NFTs transaction
export const sendNftsTransactionSchema = baseTransactionSchema.extend({
  type: z.literal("send-nfts"),
  contractAddress: addressSchema,
  tokenId: z.string().min(1, "Token ID is required").refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 0;
  }, "Must be a valid token ID"),
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
  price: positiveNumberString,
  editionType: z.enum(["fixed", "open"]),
  editionSize: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty for open edition
    const num = parseInt(val);
    return !isNaN(num) && num > 0;
  }, "Must be a positive number"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  mintLimitPerAddress: optionalPositiveNumberString,
  royaltyPercentage: z.string().min(1, "Royalty percentage is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Must be between 0 and 100"),
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
  value: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Must be a non-negative number or empty"),
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
