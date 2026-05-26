import { RequestRoundForm } from "@/components/rounds/RequestRoundForm";
import { isRoundsDatabaseConfigured } from "@/services/rounds";

export const metadata = {
  title: "Request a Round | Gnars DAO",
  description: "Request a community funding round for Gnars DAO.",
};

export default function RequestRoundPage() {
  return <RequestRoundForm databaseConfigured={isRoundsDatabaseConfigured()} />;
}
