import { describe, expect, it, vi } from "vitest";

vi.mock("thirdweb/react", () => ({
  useActiveAccount: () => null,
}));

vi.mock("@/hooks/use-user-address", () => ({
  useUserAddress: () => ({ address: undefined, isConnected: false }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: "a",
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { canShowRoundVotingControls } from "./RoundDetailView";

describe("RoundDetailView voting controls", () => {
  it("does not enable voting controls when votingPower is 0", () => {
    expect(canShowRoundVotingControls({ state: "voting_open", votingPower: 0 })).toBe(false);
  });
});
