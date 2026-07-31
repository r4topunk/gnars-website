import { NextResponse } from "next/server";
import { getStakeYields } from "@/services/yields";

export const revalidate = 300;

export async function GET() {
  const yields = await getStakeYields();
  return NextResponse.json(yields, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
