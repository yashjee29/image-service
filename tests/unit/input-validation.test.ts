import { describe, it, expect } from 'vitest';
import { VoiceProfileInputSchema } from '../../src/modules/voice-profile/schema.js';
import { VoiceLeaderboardInputSchema } from '../../src/modules/voice-leaderboard/schema.js';

describe('Input Validation Schemas', () => {
  describe('VoiceProfileInputSchema', () => {
    it('accepts valid voice profile input with defaults', () => {
      const parsed = VoiceProfileInputSchema.parse({});
      expect(parsed.schemaVersion).toBe('1.0');
    });

    it('accepts full unified API payload format', () => {
      const payload = {
        schemaVersion: '1.0',
        requestId: 'profile-render-001',
        render: {
          templateId: 'profile-card-v1',
          format: 'png',
          scale: 1,
        },
        profile: {
          userId: 'discord-user-id',
          username: 'Sakha',
          avatarUrl: 'https://example.com/avatar.png',
        },
        rank: {
          current: {
            id: 'gold',
            name: 'Gold',
            assetKey: 'rank-gold',
            minimumHours: 155,
            maximumHours: 205,
          },
          next: {
            id: 'platinum',
            name: 'Platinum',
            assetKey: 'rank-platinum',
            minimumHours: 205,
            maximumHours: 280,
          },
          progressPercent: 71,
        },
        badges: [
          {
            id: 'hall-of-fame',
            name: 'Hall of Fame',
            assetKey: 'badge-hall-of-fame',
          },
          {
            id: 'top-performer',
            name: 'Top Performer',
            assetKey: 'badge-top-performer',
          },
          {
            id: 'winner',
            name: 'Winner',
            assetKey: 'badge-winner',
          },
        ],
        counters: {
          achievements: 24,
          goals: 12,
          milestones: 7,
        },
        leaderboard: {
          rank: 1,
          topPercent: 1,
          trendValues: [18, 28, 47, 42],
        },
        activity: {
          periodLabel: 'LAST 7 DAYS',
          entries: [
            { label: 'Mon', durationMinutes: 392, isCurrentDay: false },
            { label: 'Tue', durationMinutes: 465, isCurrentDay: false },
            { label: 'Wed', durationMinutes: 310, isCurrentDay: false },
            { label: 'Thu', durationMinutes: 565, isCurrentDay: false },
            { label: 'Fri', durationMinutes: 485, isCurrentDay: false },
            { label: 'Sat', durationMinutes: 375, isCurrentDay: false },
            { label: 'Sun', durationMinutes: 547, isCurrentDay: true },
          ],
        },
        hours: {
          monthly: {
            label: 'May (Monthly)',
            durationMinutes: 19260,
          },
          weekly: {
            label: 'Weekly',
            durationMinutes: 4680,
          },
          daily: {
            label: 'Daily',
            durationMinutes: 491,
          },
          allTime: {
            label: 'All Time',
            durationMinutes: 116270,
          },
        },
        timeBreakdown: {
          camMinutes: 67680,
          nonCamMinutes: 48590,
        },
      };

      const parsed = VoiceProfileInputSchema.parse(payload);
      expect(parsed.requestId).toBe('profile-render-001');
      expect(parsed.profile?.username).toBe('Sakha');
      expect(parsed.rank?.current.id).toBe('gold');
      expect(parsed.badges).toHaveLength(3);
      expect(parsed.activity?.entries).toHaveLength(7);
      expect(parsed.hours?.monthly?.durationMinutes).toBe(19260);
      expect(parsed.timeBreakdown?.camMinutes).toBe(67680);
    });

    it('rejects oversized usernames', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          profile: {
            username: 'A'.repeat(50),
          },
        })
      ).toThrow();
    });

    it('rejects negative counters', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          counters: {
            achievements: -5,
          },
        })
      ).toThrow();
    });

    it('rejects invalid avatar URLs', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          profile: {
            avatarUrl: 'not-a-valid-url',
          },
        })
      ).toThrow();
    });

    it('rejects activity entries list with fewer than 7 days', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          activity: {
            entries: [{ label: 'Mon', durationMinutes: 100 }],
          },
        })
      ).toThrow();
    });

    it('rejects rank progressPercent greater than 100', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          rank: {
            current: { id: 'gold', name: 'Gold', minimumHours: 10, maximumHours: 20 },
            next: { id: 'platinum', name: 'Platinum', minimumHours: 20, maximumHours: 30 },
            progressPercent: 120,
          },
        })
      ).toThrow();
    });
  });

  describe('VoiceLeaderboardInputSchema', () => {
    it('accepts valid leaderboard input', () => {
      const parsed = VoiceLeaderboardInputSchema.parse({
        entries: [
          { rank: 1, username: 'TopUser', hours: '100h' },
          { rank: 2, username: 'SecondUser', hours: '80h' },
        ],
      });
      expect(parsed.entries).toHaveLength(2);
      expect(parsed.title).toBe('VOICE LEADERBOARD');
    });

    it('accepts empty entries list (for empty state rendering)', () => {
      const parsed = VoiceLeaderboardInputSchema.parse({
        entries: [],
      });
      expect(parsed.entries).toHaveLength(0);
    });

    it('rejects entries with rank outside bounds', () => {
      expect(() =>
        VoiceLeaderboardInputSchema.parse({
          entries: [{ rank: 0, username: 'Invalid', hours: '10h' }],
        })
      ).toThrow();
    });
  });
});
