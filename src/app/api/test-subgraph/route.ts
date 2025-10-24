/**
 * Test API Route - Check Subgraph Connection
 * 
 * Visit /api/test-subgraph to see raw subgraph data
 */

import { NextResponse } from "next/server";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export async function GET() {
  const daoAddress = GNARS_ADDRESSES.token.toLowerCase();

  try {
    // Simple query to get recent proposals
    const query = `
      query TestQuery($dao: String!) {
        proposals(
          where: { dao: $dao }
          orderBy: timeCreated
          orderDirection: desc
          first: 5
        ) {
          id
          proposalId
          proposalNumber
          title
          proposer
          timeCreated
        }
        proposalVotes(
          orderBy: timestamp
          orderDirection: desc
          first: 10
        ) {
          id
          voter
          support
          weight
          timestamp
          proposal {
            proposalNumber
            title
          }
        }
      }
    `;

    const data = await subgraphQuery<{
      proposals: Array<{
        id: string;
        proposalId: string;
        proposalNumber: number;
        title: string | null;
        proposer: string;
        timeCreated: string;
      }>;
      proposalVotes: Array<{
        id: string;
        voter: string;
        support: string;
        weight: string;
        timestamp: string;
        proposal: {
          proposalNumber: number;
          title: string | null;
        };
      }>;
    }>(query, { dao: daoAddress });

    return NextResponse.json({
      success: true,
      daoAddress,
      proposalsCount: data.proposals?.length || 0,
      votesCount: data.proposalVotes?.length || 0,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        daoAddress,
      },
      { status: 500 }
    );
  }
}

