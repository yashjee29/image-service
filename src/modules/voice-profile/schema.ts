import { z } from 'zod';

export const RenderOptionsSchema = z.object({
  templateId: z.string().default('profile-card-v1'),
  format: z.enum(['png']).default('png'),
  scale: z.number().positive().default(1),
}).optional();

export const ProfileInfoSchema = z.object({
  userId: z.string().optional(),
  username: z.string().min(1).max(32).default('User'),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(80).optional(),
});

export const RankDetailsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  assetKey: z.string().optional(),
  minimumHours: z.number().nonnegative(),
  maximumHours: z.number().nonnegative(),
});

export const RankProgressionSchema = z.object({
  current: RankDetailsSchema,
  next: RankDetailsSchema,
  progressPercent: z.number().min(0).max(100).default(0),
});

export const BadgeItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  assetKey: z.string().optional(),
});

export const CountersSchema = z.object({
  achievements: z.number().int().nonnegative().default(0),
  goals: z.number().int().nonnegative().default(0),
  milestones: z.number().int().nonnegative().default(0),
});

export const LeaderboardDataSchema = z.object({
  rank: z.union([z.number().int(), z.string()]).default(0),
  topPercent: z.union([z.number(), z.string()]).default(100),
  trendValues: z.array(z.number().nonnegative()).optional(),
});

export const ActivityEntrySchema = z.object({
  label: z.string().min(1).max(10),
  durationMinutes: z.number().nonnegative(),
  isCurrentDay: z.boolean().optional(),
  highlight: z.boolean().optional(),
});

export const ActivityDataSchema = z.object({
  periodLabel: z.string().default('LAST 7 DAYS'),
  entries: z.array(ActivityEntrySchema).length(7),
});

export const HourEntrySchema = z.object({
  label: z.string().optional(),
  durationMinutes: z.number().nonnegative(),
});

export const HoursDataSchema = z.object({
  monthly: HourEntrySchema.optional(),
  weekly: HourEntrySchema.optional(),
  daily: HourEntrySchema.optional(),
  allTime: HourEntrySchema.optional(),
});

export const TimeBreakdownSchema = z.object({
  camMinutes: z.number().nonnegative(),
  nonCamMinutes: z.number().nonnegative(),
});

// Legacy sub-schemas for backward compatibility
export const DayChartItemSchema = z.object({
  day: z.string().min(1).max(10),
  duration: z.string().min(1).max(15),
  minutes: z.number().int().min(0).max(1440).optional(),
  highlight: z.boolean().optional(),
});

export const VoiceProfileApiSchema = z.object({
  schemaVersion: z.string().optional().default('1.0'),
  requestId: z.string().optional(),

  render: RenderOptionsSchema,
  profile: ProfileInfoSchema.optional(),
  rank: RankProgressionSchema.optional(),
  badges: z.array(BadgeItemSchema).max(8).optional(),
  counters: CountersSchema.optional(),
  leaderboard: LeaderboardDataSchema.optional(),
  activity: ActivityDataSchema.optional(),
  hours: HoursDataSchema.optional(),
  timeBreakdown: TimeBreakdownSchema.optional(),

  // Legacy/flat fields supported gracefully
  username: z.string().min(1).max(32).optional(),
  avatarUrl: z.string().url().optional(),
  rankId: z.string().max(20).optional(),
  bio: z.string().max(80).optional(),
  achievements: z.number().int().min(0).optional(),
  goals: z.number().int().min(0).optional(),
  milestones: z.number().int().min(0).optional(),
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
});

export const VoiceProfileInputSchema = VoiceProfileApiSchema;
export type VoiceProfileInput = z.infer<typeof VoiceProfileInputSchema>;
