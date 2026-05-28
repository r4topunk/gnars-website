import { notFound } from "next/navigation";
import { SubmitRoundForm } from "@/components/rounds/SubmitRoundForm";
import { getPublicRoundBySlug, isRoundsDatabaseConfigured } from "@/services/rounds";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const round = await getPublicRoundBySlug(slug);

  return {
    title: round ? `Submit to ${round.title} | Gnars Rounds` : "Submit to Round | Gnars DAO",
    description: "Submit a project to a Gnars community round.",
  };
}

export default async function SubmitRoundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const round = await getPublicRoundBySlug(slug);

  if (!round) notFound();

  return <SubmitRoundForm round={round} databaseConfigured={isRoundsDatabaseConfigured()} />;
}
