import { notFound, redirect } from "next/navigation";
import { isAddress } from "viem";
import { MemberDetail } from "@/components/members/MemberDetail";
import { SidebarInset } from "@/components/ui/sidebar";
import { resolveAddressFromENS } from "@/lib/ens";

interface MemberPageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4">
        <MemberDetail address={address} />
      </div>
    </SidebarInset>
  );
}
