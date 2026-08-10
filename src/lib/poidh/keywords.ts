export const GNARS_DISCIPLINES = ["skate", "surf", "parkour", "weed"] as const;
export type GnarsDiscipline = (typeof GNARS_DISCIPLINES)[number];

/**
 * The Gnarly keyword list, grouped by discipline.
 *
 * Flattened it is the same list `matchesGnarsKeywords` has always used — the
 * grouping exists so a surface that only wants part of the culture (the
 * homepage showcases skate and surf) can ask for it without a second copy of
 * the vocabulary.
 */
const DISCIPLINE_KEYWORDS: Record<GnarsDiscipline, string[]> = {
  skate: [
    "kickflip",
    "heelflip",
    "ollie",
    "nollie",
    "fakie",
    "switch",
    "grind",
    "slide",
    "rail",
    "ledge",
    "manual",
    "nose manual",
    "shove-it",
    "pop shove",
    "360 flip",
    "tre flip",
    "varial",
    "hardflip",
    "inward",
    "impossible",
    "boneless",
    "no comply",
    "primo",
    "vert",
    "bowl",
    "halfpipe",
    "quarter pipe",
    "ramp",
    "mini ramp",
    "transition",
    "coping",
    "drop in",
    "pump",
    "carve",
    "street",
    "park",
    "plaza",
    "skatepark",
    "diy",
    "spot",
    "deck",
    "trucks",
    "wheels",
    "bearings",
    "grip tape",
    "skateboard",
    "skater",
    "skating",
    "skate",
  ],
  surf: [
    "barrel",
    "tube",
    "pitted",
    "cutback",
    "snap",
    "floater",
    "aerial",
    "duck dive",
    "paddle",
    "lineup",
    "set",
    "swell",
    "wave",
    "offshore",
    "onshore",
    "glassy",
    "blown out",
    "closeout",
    "shortboard",
    "longboard",
    "fish",
    "gun",
    "foam",
    "reef",
    "beach break",
    "point break",
    "surfing",
    "surfer",
    "surf",
  ],
  parkour: [
    "vault",
    "wall run",
    "cat leap",
    "precision",
    "kong",
    "dash",
    "tic tac",
    "lache",
    "flip",
    "backflip",
    "frontflip",
    "parkour",
    "freerunning",
    "traceur",
  ],
  weed: [
    "joint",
    "blunt",
    "bong",
    "dab",
    "smoke",
    "weed",
    "cannabis",
    "kush",
    "og",
    "strain",
    "flower",
    "bud",
    "420",
    "stoned",
  ],
};

const GNARS_KEYWORDS = GNARS_DISCIPLINES.flatMap((d) => DISCIPLINE_KEYWORDS[d]);

export function matchesGnarsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return GNARS_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Vocabulary that is also ordinary English.
 *
 * "set" is a wave set; it is also "a held-out set of test images", which is how
 * a Chrome-extension bounty came to be dealt as the homepage's headline SURF
 * card. These words corroborate a discipline but cannot establish one on their
 * own — a bounty needs at least one unambiguous term before they count.
 */
const AMBIGUOUS = new Set([
  // surf
  "set",
  "gun",
  "fish",
  "foam",
  "snap",
  "tube",
  // skate
  "street",
  "park",
  "spot",
  "switch",
  "slide",
  "manual",
  "pump",
  "deck",
  "transition",
  // parkour
  "flip",
  "dash",
  "precision",
  // weed
  "og",
  "flower",
  "bud",
  "smoke",
  "strain",
]);

/**
 * Word-boundary matchers, longest keyword first.
 *
 * Classification can't reuse `matchesGnarsKeywords`' substring test: "og" would
 * hit "dog", and "flip" (parkour) is inside "kickflip" (skate). Boundaries fix
 * the first; scoring by matched length fixes the second, since the longer, more
 * specific keyword outweighs the generic one it contains.
 */
const DISCIPLINE_MATCHERS: Array<{
  discipline: GnarsDiscipline;
  re: RegExp;
  weight: number;
  ambiguous: boolean;
}> = GNARS_DISCIPLINES.flatMap((discipline) =>
  DISCIPLINE_KEYWORDS[discipline].map((keyword) => ({
    discipline,
    re: new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i"),
    weight: keyword.length,
    ambiguous: AMBIGUOUS.has(keyword),
  })),
);

/**
 * The discipline a bounty most likely belongs to, or `null` when nothing in the
 * vocabulary matches. Ties break in `GNARS_DISCIPLINES` order, so a bounty that
 * reads equally skate and parkour lands on skate.
 */
export function classifyGnarsDiscipline(text: string): GnarsDiscipline | null {
  const scores = new Map<GnarsDiscipline, number>();
  const solid = new Set<GnarsDiscipline>();
  for (const { discipline, re, weight, ambiguous } of DISCIPLINE_MATCHERS) {
    if (!re.test(text)) continue;
    scores.set(discipline, (scores.get(discipline) ?? 0) + weight);
    if (!ambiguous) solid.add(discipline);
  }
  // Drop disciplines carried only by common English.
  for (const discipline of [...scores.keys()]) {
    if (!solid.has(discipline)) scores.delete(discipline);
  }
  if (scores.size === 0) return null;

  let best: GnarsDiscipline | null = null;
  let bestScore = -1;
  for (const discipline of GNARS_DISCIPLINES) {
    const score = scores.get(discipline) ?? 0;
    if (score > bestScore) {
      best = discipline;
      bestScore = score;
    }
  }
  return best;
}
