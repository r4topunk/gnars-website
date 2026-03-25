const GNARS_KEYWORDS = [
  // Skate
  'kickflip', 'heelflip', 'ollie', 'nollie', 'fakie', 'switch',
  'grind', 'slide', 'rail', 'ledge', 'manual', 'nose manual',
  'shove-it', 'pop shove', '360 flip', 'tre flip', 'varial', 'hardflip',
  'inward', 'impossible', 'boneless', 'no comply', 'primo',
  'vert', 'bowl', 'halfpipe', 'quarter pipe', 'ramp', 'mini ramp',
  'transition', 'coping', 'drop in', 'pump', 'carve',
  'street', 'park', 'plaza', 'skatepark', 'diy', 'spot',
  'deck', 'trucks', 'wheels', 'bearings', 'grip tape',
  'skateboard', 'skater', 'skating', 'skate',
  
  // Surf
  'barrel', 'tube', 'pitted', 'cutback', 'snap', 'floater', 'aerial',
  'duck dive', 'paddle', 'lineup', 'set', 'swell', 'wave',
  'offshore', 'onshore', 'glassy', 'blown out', 'closeout',
  'shortboard', 'longboard', 'fish', 'gun', 'foam',
  'reef', 'beach break', 'point break', 'surfing', 'surfer',
  
  // Parkour / Freerunning
  'vault', 'wall run', 'cat leap', 'precision', 'kong', 'dash',
  'tic tac', 'lache', 'flip', 'backflip', 'frontflip',
  'parkour', 'freerunning', 'traceur',
  
  // Weed / 420
  'joint', 'blunt', 'bong', 'dab', 'smoke', 'weed', 'cannabis',
  'kush', 'og', 'strain', 'flower', 'bud', '420', 'stoned',
];

export function matchesGnarsKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return GNARS_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}
