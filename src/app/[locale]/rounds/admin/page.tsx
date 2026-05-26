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

  return <RoundsAdminDashboard rounds={rounds} databaseConfigured={isRoundsDatabaseConfigured()} />;
}
