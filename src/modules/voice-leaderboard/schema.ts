import { z } from 'zod';
import { voiceLeaderboardConfig } from './config.js';

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1).max(100),
  position: z.number().int().min(1).max(100).optional(),
  userId: z.string().optional(),
  username: z.string().min(1).max(64),
  avatarUrl: z.string().url().optional(),
  hours: z.string().max(30).optional(), // e.g. "98h 45m" or "321h"
  durationMinutes: z.number().optional(),
  camHours: z.string().max(30).optional(),
  badge: z.string().max(30).optional(),
  rankId: z.string().max(30).optional(),
  rankName: z.string().max(30).optional(),
  isCurrentUser: z.boolean().optional(),
});

export const LeaderboardRangeSchema = z.object({
  startPosition: z.number().int().min(0).optional(),
  endPosition: z.number().int().min(0).optional(),
});

export const LeaderboardFiltersSchema = z.object({
  period: z.string().optional(),
  metric: z.string().optional(),
  month: z.string().optional(),
});

export const LeaderboardRequestContextSchema = z.object({
  requesterUserId: z.string().optional(),
});

const RawVoiceLeaderboardInputSchema = z.object({
  schemaVersion: z.string().optional(),
  requestId: z.string().optional(),
  requestContext: LeaderboardRequestContextSchema.optional(),
  requesterUserId: z.string().optional(),
  templateId: z.string().optional(),
  title: z.string().max(60).default(voiceLeaderboardConfig.defaults.title),
  subtitle: z.string().max(80).default(voiceLeaderboardConfig.defaults.subtitle),
  period: z.string().max(40).default(voiceLeaderboardConfig.defaults.period),
  category: z.string().max(40).optional(),
  range: LeaderboardRangeSchema.optional(),
  startPosition: z.number().int().min(0).optional(),
  endPosition: z.number().int().min(0).optional(),
  totalParticipants: z.number().int().min(0).optional(),
  render: z
    .object({
      templateId: z.string().optional(),
      format: z.string().optional(),
      scale: z.number().optional(),
      layout: z.string().optional(),
      highlightRequester: z.boolean().optional(),
    })
    .optional(),
  filters: LeaderboardFiltersSchema.optional(),
  entries: z.array(LeaderboardEntrySchema).min(0).max(voiceLeaderboardConfig.maxEntries),
});

export const VoiceLeaderboardInputSchema = z.preprocess((val: any) => {
  if (!val || typeof val !== 'object') return val;

  const rawLeaderboard = val.leaderboard;
  const rawEntries = Array.isArray(rawLeaderboard?.entries)
    ? rawLeaderboard.entries
    : Array.isArray(val.entries)
    ? val.entries
    : [];

  const requesterUserId = val.requestContext?.requesterUserId ?? val.requesterUserId;
  const highlightRequester = val.render?.highlightRequester ?? (requesterUserId !== undefined);

  const normalizedEntries = rawEntries.map((e: any) => {
    const rankNum = e.position ?? e.rank ?? 1;
    const rankObj = e.rank && typeof e.rank === 'object' ? e.rank : undefined;
    const isCurrentUser = Boolean(
      e.isCurrentUser ||
      (highlightRequester && requesterUserId && e.userId && e.userId === requesterUserId)
    );
    return {
      rank: rankNum,
      position: rankNum,
      userId: e.userId,
      username: e.username ?? 'User',
      avatarUrl: e.avatarUrl,
      durationMinutes: e.durationMinutes,
      hours: e.hours,
      camHours: e.camHours,
      badge: e.badge,
      rankId: rankObj?.id ?? e.rankId ?? (typeof e.rank === 'string' ? e.rank : undefined),
      rankName: rankObj?.name ?? e.rankName,
      isCurrentUser,
    };
  });

  let period = val.period;
  if (val.filters?.month) {
    period = val.filters.month;
  } else if (val.filters?.period) {
    const p = String(val.filters.period).trim();
    const lower = p.toLowerCase();
    if (lower === 'monthly') period = 'Monthly';
    else if (lower === 'daily') period = 'Daily';
    else if (lower === 'weekly') period = 'Weekly';
    else if (lower === 'all time' || lower === 'alltime' || lower === 'all-time') period = 'All-Time';
    else period = p;
  }

  let category = val.category;
  if (val.filters?.metric) {
    const m = String(val.filters.metric).trim().toLowerCase();
    if (m === 'cam' || m === 'cam hours') category = 'CAM HOURS';
    else if (m === 'non cam' || m === 'non-cam' || m === 'non cam hours') category = 'NON-CAM HOURS';
    else if (m === 'both' || m === 'all') category = 'TOTAL HOURS';
    else category = val.filters.metric;
  }

  const templateId = val.render?.templateId ?? val.templateId;
  const isStudy =
    templateId?.includes('study') ||
    rawLeaderboard !== undefined ||
    val.range !== undefined;
  const defaultTitle = isStudy
    ? voiceLeaderboardConfig.studyDefaults.title
    : voiceLeaderboardConfig.defaults.title;
  const title = val.title ?? defaultTitle;

  const defaultSubtitle = isStudy
    ? voiceLeaderboardConfig.studyDefaults.subtitle
    : voiceLeaderboardConfig.defaults.subtitle;
  const subtitle = val.subtitle ?? defaultSubtitle;

  return {
    ...val,
    templateId,
    title,
    subtitle,
    requestContext: val.requestContext,
    render: val.render,
    period: period ?? val.period,
    category: category ?? val.category,
    range: rawLeaderboard?.range ?? val.range,
    startPosition: rawLeaderboard?.range?.startPosition ?? val.range?.startPosition ?? val.startPosition,
    endPosition: rawLeaderboard?.range?.endPosition ?? val.range?.endPosition ?? val.endPosition,
    totalParticipants: rawLeaderboard?.totalParticipants ?? val.totalParticipants,
    entries: normalizedEntries,
  };
}, RawVoiceLeaderboardInputSchema);

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type VoiceLeaderboardInput = z.infer<typeof VoiceLeaderboardInputSchema>;
