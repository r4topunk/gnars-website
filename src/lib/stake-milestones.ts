// Staking milestones for the Gnars Builder subnet campaign. `amountMor` is the
// MOR-staked threshold that unlocks the milestone; `null` means the milestone is
// not amount-gated (tracked manually via `done`). Targets are the current
// program — swap here if the campaign changes.
//
// This file carries NO copy. Milestone labels live in
// `stake.page.subnet.milestones.<id>` in messages/{en,pt-br}/stake.json and are
// resolved by whoever renders the list, so the checklist follows the page locale
// instead of printing English inside a Portuguese section. The thresholds that
// appear inside those labels are interpolated as `{n, number}`, which is also
// what makes "10,000" read as "10.000" in pt-BR.

export const SUBNET_GOAL_MOR = 100_000;

export type StakeMilestone = {
  /** Also the message key under `stake.page.subnet.milestones`. */
  id: string;
  amountMor: number | null;
  done?: boolean;
};

export const SUBNET_MILESTONES: StakeMilestone[] = [
  { id: "live", amountMor: 0 },
  { id: "backers10", amountMor: null, done: false },
  { id: "10k", amountMor: 10_000 },
  { id: "50k", amountMor: 50_000 },
  { id: "100k", amountMor: 100_000 },
];

export function isMilestoneDone(m: StakeMilestone, totalStaked: number) {
  return m.amountMor === null ? Boolean(m.done) : totalStaked >= m.amountMor;
}
