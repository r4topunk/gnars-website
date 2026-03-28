import { NextResponse } from "next/server";
import { DAO_ADDRESSES, DAO_DESCRIPTION } from "@/lib/config";

export const revalidate = 60;

export async function GET() {
  const md = `# Gnars DAO

${DAO_DESCRIPTION}

## Resources

- [Proposals](/proposals) — Community grants and governance
- [Auctions](/auctions) — Daily NFT auctions
- [Members](/members) — Token holders
- [Treasury](/treasury) — DAO funds
- [About](/about) — Learn more

## Contracts (Base)

- Token: \`${DAO_ADDRESSES.token}\`
- Auction: \`${DAO_ADDRESSES.auction}\`
- Governor: \`${DAO_ADDRESSES.governor}\`
- Treasury: \`${DAO_ADDRESSES.treasury}\`
`;

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
