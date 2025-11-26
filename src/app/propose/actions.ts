"use server";

import { z } from "zod";
import { proposalSchema } from "@/components/proposals/schema";
import { encodeTransactions } from "@/lib/proposal-utils";
import { ipfsToGatewayUrl } from "@/lib/pinata";

type ProposalFormValues = z.infer<typeof proposalSchema>;

export async function createProposalAction(formData: ProposalFormValues) {
  const validationResult = proposalSchema.safeParse(formData);
  if (!validationResult.success) {
    throw new Error("Invalid proposal data");
  }

  const { title, description, bannerImage, transactions } = validationResult.data;

  // 1. Encode transactions
  const { targets, values, calldatas } = encodeTransactions(transactions);

  // 2. Prepare description with banner image at the beginning (if exists)
  let formattedDescription = description;
  
  if (bannerImage) {
    // Convert IPFS URL to gateway URL for markdown image
    const imageUrl = ipfsToGatewayUrl(bannerImage);
    formattedDescription = `![Banner](${imageUrl})\n\n${description}`;
  }

  // 3. Format: Title && Description
  // Nouns Builder uses && as separator (NOT $$ or #)
  const fullDescription = `${title}&&${formattedDescription}`;

  return {
    targets,
    values,
    calldatas,
    description: fullDescription,
  };
}
