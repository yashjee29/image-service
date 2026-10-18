export interface RankTheme {
  id: string;
  name: string;
  primaryColor: string;     // Text color for study hours & highlights
  darkerColor: string;      // Calibrated darker shade for highlighted user study hours
  cardBorder: string;       // Border stroke for podium card
  pillBg: string;           // Rank pill background
  pillBorder: string;       // Rank pill border stroke
  pillTextColor: string;    // Text color inside rank pill
  glowColor: string;        // Subtle glow / shadow
}

export const RANK_THEMES: Record<string, RankTheme> = {
  radiant: {
    id: 'radiant',
    name: 'Radiant',
    primaryColor: '#FFAA00',
    darkerColor: '#B87200',
    cardBorder: '#FFE29A',
    pillBg: '#FFFDF5',
    pillBorder: '#FDE4B0',
    pillTextColor: '#7A5200',
    glowColor: '#FFAA00',
  },
  radient: {
    id: 'radient',
    name: 'Radiant',
    primaryColor: '#FFAA00',
    darkerColor: '#B87200',
    cardBorder: '#FFE29A',
    pillBg: '#FFFDF5',
    pillBorder: '#FDE4B0',
    pillTextColor: '#7A5200',
    glowColor: '#FFAA00',
  },
  immortal: {
    id: 'immortal',
    name: 'Immortal',
    primaryColor: '#F26A5E',
    darkerColor: '#C93B2E',
    cardBorder: '#FF9B8F',
    pillBg: '#FFF8F5',
    pillBorder: '#FFDFD8',
    pillTextColor: '#7E2A24',
    glowColor: '#F26A5E',
  },
  ascendant: {
    id: 'ascendant',
    name: 'Ascendant',
    primaryColor: '#55A18C',
    darkerColor: '#246D5B',
    cardBorder: '#C5DED5',
    pillBg: '#FBF9F6',
    pillBorder: '#E5E7DF',
    pillTextColor: '#15302A',
    glowColor: '#55A18C',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    primaryColor: '#9F7BB7',
    darkerColor: '#683A85',
    cardBorder: '#E4D5EE',
    pillBg: '#FCF7FF',
    pillBorder: '#EADFF0',
    pillTextColor: '#452A56',
    glowColor: '#9F7BB7',
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    primaryColor: '#5DA09F',
    darkerColor: '#296B6A',
    cardBorder: '#C6E3E3',
    pillBg: '#F4FBFC',
    pillBorder: '#E0E9E9',
    pillTextColor: '#1D5D79',
    glowColor: '#5DA09F',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    primaryColor: '#E68D4A',
    darkerColor: '#A85312',
    cardBorder: '#F3D4B6',
    pillBg: '#FFFAF4',
    pillBorder: '#F2E7D9',
    pillTextColor: '#754316',
    glowColor: '#E68D4A',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    primaryColor: '#7A8B99',
    darkerColor: '#41515E',
    cardBorder: '#D8DEE4',
    pillBg: '#FAF8F5',
    pillBorder: '#E9E2DC',
    pillTextColor: '#454852',
    glowColor: '#7A8B99',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    primaryColor: '#BD6337',
    darkerColor: '#823412',
    cardBorder: '#E8C5B2',
    pillBg: '#FFF7F1',
    pillBorder: '#EDDCD0',
    pillTextColor: '#683019',
    glowColor: '#BD6337',
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    primaryColor: '#6D7278',
    darkerColor: '#363C44',
    cardBorder: '#D4D6D9',
    pillBg: '#F8F9FA',
    pillBorder: '#E2E4E7',
    pillTextColor: '#3E4246',
    glowColor: '#6D7278',
  },
  unrated: {
    id: 'unrated',
    name: 'Unrated',
    primaryColor: '#62636C',
    darkerColor: '#32343A',
    cardBorder: '#E2E8F0',
    pillBg: '#F8F9FA',
    pillBorder: '#E2E8F0',
    pillTextColor: '#62636C',
    glowColor: '#62636C',
  },
};

export const REQUESTER_HIGHLIGHT_THEME = {
  rankBoxBg: '#FFF1E8',        // Warm soft peach-amber glow
  rankBoxBorder: '#F27A54',    // Warm terracotta-coral
  rankBoxStrokeWidth: '2.2',
  rankNumColor: '#B93815',     // Deep warm bold terracotta
  nameColor: '#0E1726',        // Deep high-contrast dark navy-black
  cardBorder: '#F27A54',       // Warm terracotta-coral for highlighted podium card
};

export function getRankTheme(rankId?: string): RankTheme {
  if (!rankId) return RANK_THEMES.unrated!;
  const normalized = rankId.toLowerCase().trim();
  return RANK_THEMES[normalized] ?? RANK_THEMES.unrated!;
}

export const HIGH_TIER_RANKS = new Set([
  'diamond',
  'ascendant',
  'immortal',
  'radiant',
  'radient',
]);

export function isHighTierRank(rankId?: string): boolean {
  if (!rankId) return false;
  return HIGH_TIER_RANKS.has(rankId.toLowerCase().trim());
}

export const voiceLeaderboardConfig = {
  id: 'voice-leaderboard',
  version: '1.0.0',
  description: 'Cash Mod voice activity leaderboard with podium and rankings',
  dimensions: {
    width: 1200,
    height: 835,
  },
  studyDimensions: {
    width: 1536,
    height: 1024,
  },
  maxEntries: 25,
  defaults: {
    title: 'VOICE LEADERBOARD',
    subtitle: 'Top active members by total voice time',
    period: 'All-Time',
  },
  studyDefaults: {
    title: 'Study Leaderboard',
    subtitle: 'HALL OF FAME DECIDED BY CAM HOURS ONLY.',
    period: 'Monthly',
  },
};
