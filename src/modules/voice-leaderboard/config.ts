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
    primaryColor: '#D97706',
    darkerColor: '#B45309',
    cardBorder: '#FCD34D',
    pillBg: '#FEF3C7',
    pillBorder: '#FCD34D',
    pillTextColor: '#78350F',
    glowColor: '#F59E0B',
  },
  radient: {
    id: 'radient',
    name: 'Radiant',
    primaryColor: '#D97706',
    darkerColor: '#B45309',
    cardBorder: '#FCD34D',
    pillBg: '#FEF3C7',
    pillBorder: '#FCD34D',
    pillTextColor: '#78350F',
    glowColor: '#F59E0B',
  },
  immortal: {
    id: 'immortal',
    name: 'Immortal',
    primaryColor: '#E11D48',
    darkerColor: '#BE123C',
    cardBorder: '#FDA4AF',
    pillBg: '#FFE4E6',
    pillBorder: '#FDA4AF',
    pillTextColor: '#881337',
    glowColor: '#E11D48',
  },
  ascendant: {
    id: 'ascendant',
    name: 'Ascendant',
    primaryColor: '#059669',
    darkerColor: '#047857',
    cardBorder: '#6EE7B7',
    pillBg: '#D1FAE5',
    pillBorder: '#6EE7B7',
    pillTextColor: '#064E3B',
    glowColor: '#059669',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    primaryColor: '#7C3AED',
    darkerColor: '#6D28D9',
    cardBorder: '#C4B5FD',
    pillBg: '#EDE9FE',
    pillBorder: '#C4B5FD',
    pillTextColor: '#4C1D95',
    glowColor: '#7C3AED',
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    primaryColor: '#0D9488',
    darkerColor: '#0F766E',
    cardBorder: '#5EEAD4',
    pillBg: '#CCFBF1',
    pillBorder: '#5EEAD4',
    pillTextColor: '#134E4A',
    glowColor: '#0D9488',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    primaryColor: '#D97706',
    darkerColor: '#B45309',
    cardBorder: '#FCD34D',
    pillBg: '#FEF3C7',
    pillBorder: '#FCD34D',
    pillTextColor: '#78350F',
    glowColor: '#D97706',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    primaryColor: '#475569',
    darkerColor: '#334155',
    cardBorder: '#CBD5E1',
    pillBg: '#F1F5F9',
    pillBorder: '#CBD5E1',
    pillTextColor: '#334155',
    glowColor: '#475569',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    primaryColor: '#B45309',
    darkerColor: '#92400E',
    cardBorder: '#FDBA74',
    pillBg: '#FFEDD5',
    pillBorder: '#FDBA74',
    pillTextColor: '#7C2D12',
    glowColor: '#B45309',
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    primaryColor: '#475569',
    darkerColor: '#334155',
    cardBorder: '#94A3B8',
    pillBg: '#F1F5F9',
    pillBorder: '#CBD5E1',
    pillTextColor: '#1E293B',
    glowColor: '#475569',
  },
  unrated: {
    id: 'unrated',
    name: 'Unrated',
    primaryColor: '#4B5563',
    darkerColor: '#374151',
    cardBorder: '#D1D5DB',
    pillBg: '#F3F4F6',
    pillBorder: '#D1D5DB',
    pillTextColor: '#374151',
    glowColor: '#4B5563',
  },
  unranked: {
    id: 'unranked',
    name: 'Unranked',
    primaryColor: '#4B5563',
    darkerColor: '#374151',
    cardBorder: '#D1D5DB',
    pillBg: '#F3F4F6',
    pillBorder: '#D1D5DB',
    pillTextColor: '#374151',
    glowColor: '#4B5563',
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
  if (!rankId) return RANK_THEMES.unranked!;
  const normalized = rankId.toLowerCase().trim();
  if (RANK_THEMES[normalized]) return RANK_THEMES[normalized]!;

  // Partial / subword match (e.g. "gold 2", "diamond_3", "immortal 1")
  if (normalized.includes('radiant') || normalized.includes('radient')) return RANK_THEMES.radiant!;
  if (normalized.includes('immortal')) return RANK_THEMES.immortal!;
  if (normalized.includes('ascendant')) return RANK_THEMES.ascendant!;
  if (normalized.includes('diamond')) return RANK_THEMES.diamond!;
  if (normalized.includes('platinum') || normalized.includes('plat')) return RANK_THEMES.platinum!;
  if (normalized.includes('gold')) return RANK_THEMES.gold!;
  if (normalized.includes('silver')) return RANK_THEMES.silver!;
  if (normalized.includes('bronze')) return RANK_THEMES.bronze!;
  if (normalized.includes('iron')) return RANK_THEMES.iron!;
  if (normalized.includes('unrated')) return RANK_THEMES.unrated!;
  if (normalized.includes('unranked')) return RANK_THEMES.unranked!;

  return RANK_THEMES.unranked!;
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
  const normalized = rankId.toLowerCase().trim();
  for (const high of HIGH_TIER_RANKS) {
    if (normalized.includes(high)) return true;
  }
  return false;
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
