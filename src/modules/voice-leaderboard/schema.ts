import { z } from 'zod';
import { voiceLeaderboardConfig } from './config.js';

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().min(1).max(100),
  username: z.string().min(1).max(32),
  avatarUrl: z.string().url().optional(),
  hours: z.string().min(1).max(20), // e.g. "98h 45m"
  camHours: z.string().max(20).optional(),
  badge: z.string().max(30).optional(),
  isCurrentUser: z.boolean().optional(),
});

export const VoiceLeaderboardInputSchema = z.object({
  title: z.string().max(50).default(voiceLeaderboardConfig.defaults.title),
  subtitle: z.string().max(80).default(voiceLeaderboardConfig.defaults.subtitle),
  period: z.string().max(30).default(voiceLeaderboardConfig.defaults.period),
  entries: z.array(LeaderboardEntrySchema).min(1).max(voiceLeaderboardConfig.maxEntries),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type VoiceLeaderboardInput = z.infer<typeof VoiceLeaderboardInputSchema>;
