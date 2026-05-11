import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { getProfile, setApiKey } from "@zoralabs/coins-sdk";
import { isAddress, type Address } from "viem";
import { MemberDetail } from "@/components/members/MemberDetail";
import { redirect } from "@/i18n/navigation";
import { BASE_URL } from "@/lib/config";
import { resolveAddressFromENS } from "@/lib/ens";
import { MEMBERS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { serverPublicClient } from "@/lib/rpc";
import { fetchMemberOverview } from "@/services/members";

export const dynamic = "force-dynamic";

/**
 * Minimal ABIs covering the common ways a thirdweb EIP-4337 smart account
 * exposes its admin signer. Try each in order until one works.
 *
 * - `getAllAdmins() → address[]` — thirdweb's IAccountPermissions, used
 *   by DEFAULT_ACCOUNT_FACTORY_V0_6 / _V0_7 deployed accounts. First
 *   element is the primary admin (the EOA that signed the account
 *   creation).
 * - `owner() → address` — OpenZeppelin-style Ownable accounts and a few
 *   non-thirdweb implementations.
 * - `adminSigner() → address` — an older thirdweb factory variant that
 *   stored the single admin directly.
 */
const GET_ALL_ADMINS_ABI = [
  {
    name: "getAllAdmins",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]", name: "" }],
  },
] as const;

const OWNER_ABI = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
] as const;

const ADMIN_SIGNER_ABI = [
  {
    name: "adminSigner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Detects whether the given address is a deployed contract on Base and,
 * if so, attempts to read its admin EOA via one of the standard thirdweb
 * account patterns. Returns the resolved EOA address when successful,
 * `null` when the address is an EOA to begin with, and `undefined` when
 * none of the known patterns produce a usable admin.
 *
 * Result is cached for an hour per address. SA→admin relationships are
 * effectively immutable for the typical user — admins are only added via
 * explicit AccountPermissions writes — so a 1h TTL keeps profile pages
 * cheap without going stale in practice.
 */
async function resolveSmartAccountOwnerUncached(
  address: Address,
): Promise<Address | null | undefined> {
  let code: `0x${string}` | undefined;
  try {
    code = await serverPublicClient.getCode({ address });
  } catch {
    return undefined;
  }
  if (!code || code === "0x") return null; // EOA

  // 1) thirdweb IAccountPermissions
  try {
    const admins = (await serverPublicClient.readContract({
      address,
      abi: GET_ALL_ADMINS_ABI,
      functionName: "getAllAdmins",
    })) as readonly Address[];
    const first = admins.find((a) => a && a.toLowerCase() !== ZERO_ADDRESS);
    if (first) return first;
  } catch {
    // fall through
  }

  // 2) OpenZeppelin Ownable
  try {
    const owner = (await serverPublicClient.readContract({
      address,
      abi: OWNER_ABI,
      functionName: "owner",
    })) as Address;
    if (owner && owner.toLowerCase() !== ZERO_ADDRESS) return owner;
  } catch {
    // fall through
  }

  // 3) legacy thirdweb adminSigner
  try {
    const admin = (await serverPublicClient.readContract({
      address,
      abi: ADMIN_SIGNER_ABI,
      functionName: "adminSigner",
    })) as Address;
    if (admin && admin.toLowerCase() !== ZERO_ADDRESS) return admin;
  } catch {
    // fall through
  }

  return undefined;
}

const resolveSmartAccountOwner = unstable_cache(
  resolveSmartAccountOwnerUncached,
  ["members:resolve-sa-owner"],
  { revalidate: 3600, tags: ["members:sa-owner"] },
);

interface MemberPageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Helper to fetch member metadata for OG tags
async function getMemberMetadata(address: string) {
  try {
    // Fetch Zora profile data
    if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
      setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    }

    const [zoraProfile, memberOverview] = await Promise.all([
      getProfile({ identifier: address }).catch(() => null),
      fetchMemberOverview(address).catch(() => null),
    ]);

    const profile = zoraProfile?.data?.profile;
    const displayName =
      profile?.displayName || profile?.handle || `${address.slice(0, 6)}...${address.slice(-4)}`;
    const avatar = profile?.avatar?.medium || profile?.avatar?.small;
    const tokenCount = memberOverview?.tokenCount || 0;

    // Safely access creatorCoin properties
    const creatorCoin = profile?.creatorCoin as
      | {
          address?: string;
          name?: string;
          symbol?: string;
          marketCap?: string;
          marketCapDelta24h?: string;
          mediaContent?: {
            previewImage?: {
              small?: string;
              medium?: string;
              blurhash?: string;
            };
          };
        }
      | undefined;

    // Use avatar or creator coin image if available
    const imageUrl =
      avatar ||
      creatorCoin?.mediaContent?.previewImage?.medium ||
      creatorCoin?.mediaContent?.previewImage?.small ||
      `${BASE_URL}/logo-banner.jpg`;

    return {
      displayName,
      imageUrl,
      tokenCount,
      hasCreatorCoin: !!creatorCoin,
      creatorCoinName: creatorCoin?.name,
    };
  } catch (error) {
    console.error("Error fetching member metadata:", error);
    return null;
  }
}

export async function generateMetadata({ params }: MemberPageProps): Promise<Metadata> {
  const { address } = await params;

  // Check if it's a valid address
  if (!isAddress(address)) {
    return {
      title: "Member Not Found | Gnars DAO",
      description: "The member profile you're looking for doesn't exist.",
    };
  }

  const metadata = await getMemberMetadata(address);

  if (!metadata) {
    return {
      title: `${address.slice(0, 6)}...${address.slice(-4)} | Gnars DAO`,
      description: "View this member's profile on Gnars DAO.",
    };
  }

  const { displayName, tokenCount, hasCreatorCoin, creatorCoinName } = metadata;

  // Build description based on available data
  const descriptionParts = [];
  if (tokenCount > 0) {
    descriptionParts.push(`${tokenCount} Gnar${tokenCount !== 1 ? "s" : ""}`);
  }
  if (hasCreatorCoin && creatorCoinName) {
    descriptionParts.push(`Creator of ${creatorCoinName}`);
  }
  const description =
    descriptionParts.length > 0
      ? `${displayName}: ${descriptionParts.join(" • ")}`
      : `View ${displayName}'s profile on Gnars DAO`;

  const memberUrl = `${BASE_URL}/members/${address}`;

  // Dynamic OG image will be auto-generated by opengraph-image.tsx
  const ogImageUrl = `${memberUrl}/opengraph-image`;

  // Build dynamic miniapp embed with member-specific data
  const miniappEmbed = {
    ...MEMBERS_MINIAPP_EMBED_CONFIG,
    imageUrl: ogImageUrl,
    button: {
      ...MEMBERS_MINIAPP_EMBED_CONFIG.button,
      title: `View ${displayName}`,
      action: {
        ...MEMBERS_MINIAPP_EMBED_CONFIG.button.action,
        url: memberUrl,
      },
    },
  };

  return {
    title: `${displayName} | Gnars DAO`,
    description,
    openGraph: {
      title: displayName,
      description,
      images: [ogImageUrl],
      type: "profile",
      url: memberUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description,
      images: [ogImageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappEmbed),
    },
  };
}

export default async function MemberPage({ params, searchParams }: MemberPageProps) {
  const [{ address }, sp] = await Promise.all([params, searchParams]);
  if (!isAddress(address)) {
    // Treat as ENS name and try to resolve
    if (address && address.includes(".")) {
      const resolved = await resolveAddressFromENS(address);
      if (resolved) {
        const qs = new URLSearchParams();
        if (sp) {
          for (const [key, value] of Object.entries(sp)) {
            if (typeof value === "string") {
              qs.set(key, value);
            } else if (Array.isArray(value)) {
              for (const v of value) qs.append(key, v);
            }
          }
        }
        const suffix = qs.toString();
        redirect(suffix ? `/members/${resolved}?${suffix}` : `/members/${resolved}`);
      }
      notFound();
    }
    notFound();
  }

  // If the URL address is a deployed smart account, redirect to its admin
  // EOA's profile. The joint-fetch logic at the EOA page aggregates data
  // from both sides, so landing on the EOA is canonical.
  const owner = await resolveSmartAccountOwner(address);
  if (owner && owner.toLowerCase() !== address.toLowerCase()) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(sp ?? {})) {
      if (typeof value === "string") {
        qs.set(key, value);
      } else if (Array.isArray(value)) {
        for (const v of value) qs.append(key, v);
      }
    }
    const suffix = qs.toString();
    redirect(suffix ? `/members/${owner}?${suffix}` : `/members/${owner}`);
  }

  return (
    <div className="py-8">
      <MemberDetail address={address} />
    </div>
  );
}
