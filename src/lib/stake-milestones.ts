// Staking milestones for the Gnars Builder subnet campaign. `amountMor` is the
// MOR-staked threshold that unlocks the milestone. Targets are the current
// program — swap here if the campaign changes.
//
// WHAT THIS LADDER MEANS. It is what Gnars DELIVERS to amplify Morpheus as the
// subnet grows, not what a staker earns. The two are easy to confuse and the page
// used to carry the other axis (featured wall / community drop / IRL event), which
// contradicted the stake dialog's own disclaimer that "rewards accrue to the
// subnet, not to individual stakers". This ladder is a unilateral Gnars
// commitment, built on Morpheus's open protocol — it is not a partnership and
// implies nothing agreed or returned by the Morpheus side.
//
// `firmness` is why the ladder can be published before it is fully locked in: only
// the 10k anchor is a real commitment, so the other five ship labelled `proposed`
// rather than silently reading as promises.
//
// This file carries NO copy. Milestone labels live in
// `stake.page.subnet.milestones.<id>` in messages/{en,pt-br}/stake.json and are
// resolved by whoever renders the list, so the checklist follows the page locale
// instead of printing English inside a Portuguese section. The thresholds that
// appear inside those labels are interpolated as `{n, number}`, which is also
// what makes "10,000" read as "10.000" in pt-BR. Firmness labels live alongside
// them under `stake.page.subnet.firmness.<firmness>`.

export const SUBNET_GOAL_MOR = 100_000;

/** Committed = Gnars has locked this in. Proposed = direction, not a promise. */
export type MilestoneFirmness = "committed" | "proposed";

export type StakeMilestone = {
  /** Also the message key under `stake.page.subnet.milestones`. */
  id: string;
  amountMor: number;
  firmness: MilestoneFirmness;
};

export const SUBNET_MILESTONES: StakeMilestone[] = [
  { id: "10k", amountMor: 10_000, firmness: "committed" },
  { id: "15k", amountMor: 15_000, firmness: "proposed" },
  { id: "25k", amountMor: 25_000, firmness: "proposed" },
  { id: "30k", amountMor: 30_000, firmness: "proposed" },
  { id: "50k", amountMor: 50_000, firmness: "proposed" },
  { id: "100k", amountMor: 100_000, firmness: "proposed" },
];

export function isMilestoneDone(m: StakeMilestone, totalStaked: number) {
  return totalStaked >= m.amountMor;
}

/**
 * The lowest milestone the subnet has NOT reached yet — the one the page should
 * be counting toward right now. `null` once every milestone is behind us.
 *
 * Derived, never hardcoded to a tier: the campaign points people at "the 10,000
 * MOR milestone", but that is only today's answer. This walks the ladder, so the
 * day 10k lands the page starts counting toward 15k on its own. SUBNET_MILESTONES
 * is ascending, which is what makes `find` the right pick rather than a sort.
 */
export function nextMilestone(totalStaked: number): StakeMilestone | null {
  return SUBNET_MILESTONES.find((m) => totalStaked < m.amountMor) ?? null;
}
