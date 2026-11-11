import { z } from 'zod';

export const WelcomeImageProfileSchema = z.object({
  userId: z.string().optional(),
  username: z.string().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  avatar: z.string().optional(),
}).passthrough();

export const WelcomeImageInputSchema = z.object({
  username: z.string().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  avatar: z.string().optional(),
  avatarDataUri: z.string().optional(),
  greeting: z.string().optional(),
  badgeText: z.string().optional(),
  subtitle: z.string().optional(),
  quoteTitle: z.string().optional(),
  quoteLine1: z.string().optional(),
  quoteLine2: z.string().optional(),
  showAccentRays: z.boolean().optional(),
  maxCharLimit: z.number().int().positive().optional(),
  profile: WelcomeImageProfileSchema.optional(),
  user: WelcomeImageProfileSchema.optional(),
  render: z.object({
    templateId: z.string().optional(),
    format: z.enum(['png']).default('png').optional(),
    scale: z.number().positive().default(1).optional(),
  }).optional(),
  options: z.object({
    dimensions: z.object({
      width: z.number().positive().optional(),
      scale: z.number().positive().optional(),
    }).optional(),
    background: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export type WelcomeImageInput = z.infer<typeof WelcomeImageInputSchema>;
