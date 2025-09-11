import { z } from "zod";
import { proposalSchema, proposalVoteSchema } from "@/lib/schemas/proposals";

export type ProposalVote = z.infer<typeof proposalVoteSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
