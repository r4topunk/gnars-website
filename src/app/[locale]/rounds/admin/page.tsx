import { RoundsAdminDashboard } from "@/components/rounds/RoundsAdminDashboard";
import type { Round } from "@/features/rounds/types";
import { isRoundsDatabaseConfigured, listPublicRounds } from "@/services/rounds";

export const metadata = {
  title: "Rounds Admin | Gnars DAO",
  description: "Admin dashboard for Gnars community rounds.",
};

export default async function RoundsAdminPage() {
  let rounds: Round[] = [];

  try {
    rounds = await listPublicRounds();
  } catch (error) {
    console.error("[rounds] admin load failed", error);
  }

  // Round requests carry requester PII (name + email) and are intentionally
  // NOT fetched here: props from a Server Component are serialized into the
  // RSC payload sent to every visitor, and the client `isAdmin` check only
  // hides DOM. Requests are loaded client-side from a signature-gated admin
  // API route after an approved wallet authenticates.
  return <RoundsAdminDashboard rounds={rounds} databaseConfigured={isRoundsDatabaseConfigured()} />;
}
