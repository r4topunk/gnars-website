"use server";

import { z } from "zod";
import { proposalSchema } from "@/components/proposals/schema";
import { encodeTransactions } from "@/lib/proposal-utils";
import { formatProposalDescription } from "@/lib/proposal-description-utils";

type ProposalFormValues = z.infer<typeof proposalSchema>;

export async function createProposalAction(formData: ProposalFormValues) {
  const validationResult = proposalSchema.safeParse(formData);
  if (!validationResult.success) {
    throw new Error("Invalid proposal data");
  }

  const { title, description, transactions } = validationResult.data;

  // 1. Upload to IPFS (mocked)
  const ipfsHash = `QmProposal${Date.now()}`;

  // 2. Encode transactions
  const { targets, values, calldatas } = encodeTransactions(transactions);

  // 3. Format description with && separator for Builder SDK
  const formattedDescription = formatProposalDescription(title, description, ipfsHash);

  return {
    targets,
    values,
    calldatas,
    description: formattedDescription,
  };
}
