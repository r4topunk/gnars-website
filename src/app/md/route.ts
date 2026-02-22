import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  const md = `# Gnars DAO

Community-owned skateboarding DAO funding skate culture worldwide through auctions, proposals, and grants.

## About

Gnars is a skateboarding collective and community-owned skate brand. We support skaters, filmmakers, designers, and DIY projects by voting on proposals and funding them with community resources.

## Resources

- [Proposals](/proposals) — Community grants and governance
- [Auctions](/auctions) — Daily NFT auctions
- [Members](/members) — Token holders
- [Treasury](/treasury) — DAO funds
- [About](/about) — Learn more

## Contracts (Base)

- Token: \`0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17\`
- Auction: \`0x494eaa55ecf6310658b8fc004b0888dcb698097f\`
- Governor: \`0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c\`
- Treasury: \`0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88\`
`;

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
