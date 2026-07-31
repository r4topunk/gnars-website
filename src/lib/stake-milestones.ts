// Staking milestones for the Gnars Builder subnet campaign. `amountMor` is the
// MOR-staked threshold that unlocks the milestone; `null` means the milestone is
// not amount-gated (tracked manually via `done`). Copy/targets are the current
// program — swap here if the campaign changes.

export const SUBNET_GOAL_MOR = 100_000;

export type StakeMilestone = {
  id: string;
  label: string;
  amountMor: number | null;
  done?: boolean;
};

export const SUBNET_MILESTONES: StakeMilestone[] = [
  { id: "live", label: "Subnet live — Gnars is a Morpheus Builder", amountMor: 0 },
  { id: "backers10", label: "First 10 backers on board", amountMor: null, done: false },
  { id: "10k", label: "10,000 MOR staked — featured stakers wall", amountMor: 10_000 },
  { id: "50k", label: "50,000 MOR staked — community drop", amountMor: 50_000 },
  { id: "100k", label: "100,000 MOR staked — IRL Gnars event", amountMor: 100_000 },
];

export function isMilestoneDone(m: StakeMilestone, totalStaked: number) {
  return m.amountMor === null ? Boolean(m.done) : totalStaked >= m.amountMor;
}
