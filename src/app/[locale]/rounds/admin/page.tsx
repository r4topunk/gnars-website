import { RoundsAdminDashboard } from "@/components/rounds/RoundsAdminDashboard";
import type { Round, RoundRequest } from "@/features/rounds/types";
import { isRoundsDatabaseConfigured, listPublicRounds, listRoundRequests } from "@/services/rounds";

export const metadata = {
  title: "Rounds Admin | Gnars DAO",
  description: "Admin dashboard for Gnars community rounds.",
};

export default async function RoundsAdminPage() {
  let rounds: Round[] = [];
  let requests: RoundRequest[] = [];

  try {
    [rounds, requests] = await Promise.all([listPublicRounds(), listRoundRequests()]);
  } catch (error) {
    console.error("[rounds] admin load failed", error);
  }

  return (
    <RoundsAdminDashboard
      rounds={rounds}
      requests={requests}
      databaseConfigured={isRoundsDatabaseConfigured()}
    />
  );
}
