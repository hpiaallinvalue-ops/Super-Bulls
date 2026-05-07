/**
 * Category Configuration — Sport Classification Rules
 *
 * IMPORTANT: Since every channel now specializes in ONE sport,
 * classification is deterministic via CHANNEL_CATEGORY_MAP (channels.ts).
 * The keyword rules below serve as a FALLBACK SAFETY NET for any
 * video that somehow arrives without a category (e.g., manual entry).
 *
 * Primary classification: channel config → category (100% accurate)
 * Fallback classification: keyword matching (below)
 */

export interface CategoryRule {
  name: string;
  keywords: string[];
  icon: string;
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    name: 'Football',
    keywords: [
      'football', 'soccer', 'premier league', 'la liga', 'champions league',
      'seria a', 'bundesliga', 'world cup', 'epl', 'messi', 'ronaldo',
      'goal', 'penalty', 'transfer', 'liverpool', 'manchester', 'arsenal',
      'chelsea', 'barcelona', 'real madrid', 'neymar', 'mbappe', 'haaland',
      'el clasico', 'derby', 'offside', 'red card', 'yellow card', 'header',
      'free kick', 'corner', 'var', 'extra time', 'aggregate', 'leg',
    ],
    icon: 'CircleDot',
  },
  {
    name: 'Basketball',
    keywords: [
      'basketball', 'nba', 'ncaa', 'slam dunk', 'three pointer', 'playoff',
      'draft', 'lebron', 'curry', 'jordan', 'dunk', 'basket', 'warriors',
      'lakers', 'celtics', 'bulls', 'mvp', 'rebound', 'assist', 'layup',
      'three-point', 'free throw', 'pick and roll', 'point guard',
      'power forward', 'center', 'small forward', 'shot clock',
    ],
    icon: 'Circle',
  },
  {
    name: 'Cricket',
    keywords: [
      'cricket', 'ipl', 'test match', 'odi', 't20', 'world cup cricket',
      'batting', 'bowling', 'wicket', 'six', 'sachin', 'virat', 'kohli',
      'bbl', 'ashes', 'cricket world cup', 'run out', 'lbw', ' googly',
      'sweep shot', 'cover drive', 'maiden over', 'century', 'half-century',
      'fast bowler', 'spin bowler', 'all-rounder', 'stumps',
    ],
    icon: 'Swords',
  },
  {
    name: 'MMA',
    keywords: [
      'mma', 'ufc', 'fight', 'knockout', 'submission', 'tap out',
      'octagon', 'dana white', 'championship', 'fight night',
      'conor mcgregor', 'jon jones', 'islam makhachev', 'boxing',
      'heavyweight', 'lightweight', 'welterweight', 'middleweight',
      'bantamweight', 'featherweight', 'rear naked choke', 'triangle',
      'armbar', 'tko', 'decision', 'pay-per-view',
    ],
    icon: 'Shield',
  },
  {
    name: 'Tennis',
    keywords: [
      'tennis', 'wimbledon', 'us open', 'french open', 'australian open',
      'atp', 'wta', 'grand slam', 'serve', 'rally', 'nadal', 'federer',
      'djokovic', 'serena', 'deuce', 'ace', 'break point', 'set',
      'match point', 'love', 'advantage', 'tiebreak', 'baseline',
      'volley', 'backhand', 'forehand', 'drop shot',
    ],
    icon: 'Trophy',
  },
  {
    name: 'Baseball',
    keywords: [
      'baseball', 'mlb', 'world series', 'home run', 'pitch', 'bat',
      'strike', 'inning', 'diamond', 'yankees', 'dodgers', 'red sox',
      'double play', 'triple play', 'ERA', 'RBI', 'fly ball',
      'ground ball', 'line drive', 'bullpen', 'closer', 'mound',
      'at-bat', 'stolen base', 'walk-off',
    ],
    icon: 'Home',
  },
];

export const ALL_CATEGORIES = ['All', ...CATEGORY_RULES.map(c => c.name)];

export const CATEGORY_COLORS: Record<string, string> = {
  Football: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  Basketball: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  Cricket: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  MMA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  Tennis: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  Baseball: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
};
