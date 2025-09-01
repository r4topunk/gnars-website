import { MemberDetail } from "@/components/member-detail";
import { resolveAddressFromENS } from "@/lib/ens";
import { redirect, notFound } from "next/navigation";
import { isAddress } from "viem";

interface MemberPageProps {
  params: Promise<{ address: string }>;
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { address } = await params;
  if (!isAddress(address)) {
    // Treat as ENS name and try to resolve
    if (address && address.includes(".")) {
      const resolved = await resolveAddressFromENS(address);
      if (resolved) {
        redirect(`/members/${resolved}`);
      }
      notFound();
    }
    notFound();
  }
  return (
    <div className="container mx-auto py-8 px-4">
      <MemberDetail address={address} />
    </div>
  );
}


