// The four-phase roadmap shown under the subnet section on /stake.
//
// Phase 1 is what the page already is; phases 2-4 are direction. `status` is the
// only state here — there is no date, because a roadmap that prints quarters ages
// into a liability the moment one slips.
//
// Like SUBNET_MILESTONES, this file carries NO copy: titles and descriptions live
// in `stake.page.subnet.roadmap.phases.<id>` in messages/{en,pt-br}/stake.json so
// the section speaks the page's language.
//
// PHASE 4 IS A VALUE PROMISE. The $gnars airdrop copy ships with an explicit
// "planned / not guaranteed / subject to change" hedge in BOTH locales. That hedge
// is the thing that makes it publishable — do not trim it to tighten the line.

export type RoadmapStatus = "live" | "upcoming";

export type RoadmapPhase = {
  /** Also the message key under `stake.page.subnet.roadmap.phases`. */
  id: string;
  status: RoadmapStatus;
};

export const STAKE_ROADMAP: RoadmapPhase[] = [
  { id: "staking", status: "live" },
  { id: "agent", status: "upcoming" },
  { id: "inference", status: "upcoming" },
  { id: "airdrop", status: "upcoming" },
];
