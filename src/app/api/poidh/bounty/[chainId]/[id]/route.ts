import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_CHAINS } from '@/lib/poidh/config';

const SUPPORTED_CHAIN_IDS = Object.values(SUPPORTED_CHAINS);

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
    const res = await fetch('https://poidh.xyz/api/trpc/bounties.fetchAll', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`POIDH API error: ${res.status}`);

    const raw = await res.json();
    const all: unknown[] = Array.isArray(raw?.result?.data?.json)
      ? raw.result.data.json
      : [];

    const bounty = all.find(
      (b: unknown) =>
        (b as { chainId: number; id: number }).chainId === chainId &&
        (b as { chainId: number; id: number }).id === id,
    );

    if (!bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    return NextResponse.json({ bounty });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch bounty' },
      { status: 500 },
    );
  }
}
