import { notFound } from "next/navigation";
import { RoundDetailView } from "@/components/rounds/RoundDetailView";
import { getPublicRoundBySlug, isRoundsDatabaseConfigured } from "@/services/rounds";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const round = await getPublicRoundBySlug(slug);

  return {
    title: round ? `${round.title} | Gnars Rounds` : "Round | Gnars DAO",
    description: round?.description || "View this Gnars community round.",
  };
}

export default async function RoundDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const round = await getPublicRoundBySlug(slug);

  if (!round) notFound();

  return <RoundDetailView round={round} databaseConfigured={isRoundsDatabaseConfigured()} />;
}
