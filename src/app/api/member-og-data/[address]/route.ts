import { NextRequest, NextResponse } from "next/server";
import { getProfile, setApiKey } from "@zoralabs/coins-sdk";
import { fetchDelegators, fetchMemberOverview, fetchMemberVotes } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  try {
    // Initialize Zora API
    if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
      setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    }

    // Fetch all member data in parallel
    const [zoraProfile, memberOverview, delegators, votes] = await Promise.all([
      getProfile({ identifier: address }).catch(() => null),
      fetchMemberOverview(address).catch(() => null),
      fetchDelegators(address).catch(() => [] as string[]),
      fetchMemberVotes(address, 100).catch(() => ({ votes: [] })),
    ]);

    const profile = zoraProfile?.data?.profile;
    const displayName =
      profile?.displayName || profile?.handle || `${address.slice(0, 6)}...${address.slice(-4)}`;
    const avatar = profile?.avatar?.medium || profile?.avatar?.small;
    const tokenCount = memberOverview?.tokenCount || 0;
    const delegatorCount = delegators?.length || 0;
    const voteCount = votes?.votes?.length || 0;

    // Safely access creatorCoin properties
    const coin = profile?.creatorCoin as {
      address?: string;
      name?: string;
      symbol?: string;
      marketCap?: string;
      marketCapDelta24h?: string;
    } | undefined;

    const creatorCoin = coin
      ? {
          address: coin.address,
          name: coin.name,
          symbol: coin.symbol,
          marketCap: coin.marketCap,
          marketCapDelta24h: coin.marketCapDelta24h,
        }
      : null;

    return NextResponse.json({
      displayName,
      avatar,
      tokenCount,
      delegatorCount,
      voteCount,
      creatorCoin,
    });
  } catch (error) {
    console.error("Error fetching member OG data:", error);
    return NextResponse.json(
      {
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        avatar: null,
        tokenCount: 0,
        delegatorCount: 0,
        voteCount: 0,
        creatorCoin: null,
      },
      { status: 200 }
    );
  }
}
