import { MemberDetail } from "@/components/member-detail";

interface MemberPageProps {
  params: Promise<{ address: string }>;
}

export default async function MemberPage({ params }: MemberPageProps) {
  const { address } = await params;
  return (
    <div className="container mx-auto py-8 px-4">
      <MemberDetail address={address} />
    </div>
  );
}


