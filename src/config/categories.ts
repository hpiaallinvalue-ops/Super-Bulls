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
    ],
    icon: 'CircleDot',
  },
  {
    name: 'Basketball',
    keywords: [
      'basketball', 'nba', 'ncaa', 'slam dunk', 'three pointer', 'playoff',
      'draft', 'lebron', 'curry', 'jordan', 'dunk', 'basket', 'warriors',
      'lakers', 'celtics', 'bulls', 'mvp',
    ],
    icon: 'Circle',
  },
  {
    name: 'Cricket',
    keywords: [
      'cricket', 'ipl', 'test match', 'odi', 't20', 'world cup cricket',
      'batting', 'bowling', 'wicket', 'six', 'sachin', 'virat', 'kohli',
      'bbl', 'ashes', 'cricket world cup',
    ],
    icon: 'Swords',
  },
  {
    name: 'MMA',
    keywords: [
      'mma', 'ufc', 'fight', 'knockout', 'submission', 'tap out',
      'octagon', 'dana white', 'championship', 'fight night',
      'conor mcgregor', 'jon jones', 'islam makhachev',
    ],
    icon: 'Shield',
  },
  {
    name: 'Tennis',
    keywords: [
      'tennis', 'wimbledon', 'us open', 'french open', 'australian open',
      'atp', 'wta', 'grand slam', 'serve', 'rally', 'nadal', 'federer',
      'djokovic', 'serena', 'deuce',
    ],
    icon: 'Trophy',
  },
  {
    name: 'Baseball',
    keywords: [
      'baseball', 'mlb', 'world series', 'home run', 'pitch', 'bat',
      'strike', 'inning', 'diamond', 'yankees', 'dodgers', 'red sox',
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
