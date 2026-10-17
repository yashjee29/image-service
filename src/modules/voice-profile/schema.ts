import { z } from 'zod';

export const DayChartItemSchema = z.object({
  day: z.string().min(1).max(10), // e.g. 'Mon'
  duration: z.string().min(1).max(15), // e.g. '6h 32m'
  minutes: z.number().int().min(0).max(1440).optional(),
  highlight: z.boolean().optional(),
});

export const VoiceProfileInputSchema = z.object({
  username: z.string().min(1).max(32).default('Sakha'),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(80).optional(),
  achievements: z.number().int().min(0).optional(),
  goals: z.number().int().min(0).optional(),
  milestones: z.number().int().min(0).optional(),
  leaderboard: z
    .object({
      rank: z.string().max(10).optional(),
      percentile: z.string().max(20).optional(),
    })
    .optional(),
  last7Days: z.array(DayChartItemSchema).length(7).optional(),
  hoursOverview: z
    .object({
      monthly: z.string().max(20).optional(),
      monthlyLabel: z.string().max(30).optional(),
      weekly: z.string().max(20).optional(),
      daily: z.string().max(20).optional(),
      allTime: z.string().max(20).optional(),
    })
    .optional(),
  nextRank: z
    .object({
      currentRank: z.string().max(30).optional(),
      currentRange: z.string().max(30).optional(),
      nextRank: z.string().max(30).optional(),
      nextRange: z.string().max(30).optional(),
      progressPercent: z.number().min(0).max(100).optional(),
    })
    .optional(),
  timeBreakdown: z
    .object({
      camHours: z.string().max(20).optional(),
      camPercent: z.string().max(10).optional(),
      nonCamHours: z.string().max(20).optional(),
      nonCamPercent: z.string().max(10).optional(),
      overallHours: z.string().max(20).optional(),
    })
    .optional(),
});

export type VoiceProfileInput = z.infer<typeof VoiceProfileInputSchema>;
