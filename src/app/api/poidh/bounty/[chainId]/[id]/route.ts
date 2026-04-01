import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_CHAINS } from '@/lib/poidh/config';

const SUPPORTED_CHAIN_IDS = Object.values(SUPPORTED_CHAINS);
const POIDH_TRPC = 'https://poidh.xyz/api/trpc';

export const revalidate = 60; // 1 minute cache

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainId: string; id: string }> },
) {
  const { chainId: chainIdStr, id: idStr } = await params;
  const chainId = parseInt(chainIdStr, 10);
  const id = parseInt(idStr, 10);

  if (!SUPPORTED_CHAIN_IDS.includes(chainId as (typeof SUPPORTED_CHAIN_IDS)[number])) {
    return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  try {
    // Fetch bounty detail and claims in parallel using POIDH tRPC API
    const bountyInput = JSON.stringify({ json: { id, chainId } });
    const claimsInput = JSON.stringify({ json: { bountyId: id, chainId, limit: 50 } });

    const [bountyRes, claimsRes] = await Promise.all([
      fetch(`${POIDH_TRPC}/bounties.fetch?input=${encodeURIComponent(bountyInput)}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
      fetch(`${POIDH_TRPC}/claims.fetchBountyClaims?input=${encodeURIComponent(claimsInput)}`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
    ]);

    if (!bountyRes.ok) throw new Error(`POIDH bounty API error: ${bountyRes.status}`);

    const bountyRaw = await bountyRes.json();
    const bounty = bountyRaw?.result?.data?.json;

    if (!bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Parse claims (may fail independently - bounty still works without them)
    let claims: unknown[] = [];
    if (claimsRes.ok) {
      const claimsRaw = await claimsRes.json();
      claims = claimsRaw?.result?.data?.json?.items ?? [];
    }

    // Map claims to our format
    const mappedClaims = claims.map((c: unknown) => {
      const claim = c as {
        id: number;
        bountyId: number;
        title?: string;
        description?: string;
        issuer: string;
        isAccepted: boolean;
        url?: string | null;
        onChainId?: number;
      };
      return {
        id: claim.id,
        bountyId: claim.bountyId,
        name: claim.title || `Claim #${claim.id}`,
        description: claim.description || '',
        issuer: claim.issuer,
        createdAt: 0, // not returned by POIDH claims API
        accepted: claim.isAccepted,
        url: claim.url || null,
      };
    });

    return NextResponse.json({
      bounty: {
        ...bounty,
        isOpenBounty: bounty.isOpenBounty === true,
        claims: mappedClaims,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch bounty' },
      { status: 500 },
    );
  }
}
