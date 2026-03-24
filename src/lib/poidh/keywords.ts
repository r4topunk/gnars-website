// Gnars-related keywords filter for POIDH bounties

export const GNARS_KEYWORDS = [
  // Core Gnars
  'gnar', 'gnars', 'gnarly', 'gnarlier', 'gnarliest',
  
  // Skateboarding
  'skate', 'skateboard', 'skating', 'skater', 'skateboarding',
  'skatehive', 'skatepark', 'skate park', 'bowl', 'mini ramp', 'mini-ramp',
  'vert', 'street', 'park skating',
  
  // Skate Tricks
  'kickflip', 'heelflip', 'tre flip', 'treflip', '360 flip', 'varial flip',
  'ollie', 'nollie', 'fakie', 'switch',
  'grind', 'boardslide', 'nosegrind', 'tailslide', '50-50', '5-0',
  'feeble', 'smith', 'crooked', 'noseslide',
  'manual', 'nose manual', 'manny',
  'pop shove-it', 'shuv-it', 'shuvit', 'bigspin',
  'impossible', 'frontside', 'backside',
  
  // Surfing
  'surf', 'surfing', 'surfer', 'surfboard', 'wave', 'waves',
  'barrel', 'tube', 'shacked', 'cutback', 'snap',
  'carve', 'carving', 'aerial', 'floater', 'bottom turn',
  'top turn', 'duck dive', 'paddle out', 'lineup',
  'longboard', 'shortboard', 'bodyboard', 'bodysurf',
  'reef', 'break', 'swell', 'offshore', 'onshore',
  
  // Parkour/Freerunning
  'parkour', 'freerun', 'freerunning', 'traceur',
  'vault', 'precision', 'wall run', 'cat leap',
  'kong vault', 'dash vault', 'flip', 'gainer',
  'flow', 'urbex', 'rooftop',
  
  // Cannabis Culture
  'weed', 'cannabis', 'joint', 'joints', 'blunt', 'blunts',
  'bong', 'dab', 'dabs', 'hash', 'kush', 'og',
  'sativa', 'indica', 'hybrid', 'thc', 'cbd',
  'stoner', 'smoke sesh', 'session', 'sesh', '420',
  'spliff', 'edible', 'edibles', 'cannabinoid',
  
  // General Action Sports
  'bmx', 'mtb', 'mountain bike', 'bike park',
  'snowboard', 'snowboarding', 'shred', 'shredding',
  'send', 'sender', 'gnarly trick',
  'extreme sport', 'action sport',
] as const;

/**
 * Check if text contains any Gnars-related keywords
 */
export function matchesGnarsKeywords(text: string): boolean {
  const normalized = text.toLowerCase();
  return GNARS_KEYWORDS.some(keyword => normalized.includes(keyword));
}

/**
 * Extract matching keywords from text (for debugging)
 */
export function extractMatchingKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  return GNARS_KEYWORDS.filter(keyword => normalized.includes(keyword));
}
