import { describe, it, expect } from 'vitest';
import { VoiceProfileInputSchema } from '../../src/modules/voice-profile/schema.js';
import { VoiceLeaderboardInputSchema } from '../../src/modules/voice-leaderboard/schema.js';

describe('Input Validation Schemas', () => {
  describe('VoiceProfileInputSchema', () => {
    it('accepts valid voice profile input with defaults', () => {
      const parsed = VoiceProfileInputSchema.parse({});
      expect(parsed.username).toBe('Sakha');
    });

    it('accepts custom voice profile payload', () => {
      const parsed = VoiceProfileInputSchema.parse({
        username: 'ProGamer',
        bio: 'Grinding daily',
        achievements: 30,
        goals: 15,
        milestones: 8,
        hoursOverview: {
          monthly: '400h',
          weekly: '90h',
          daily: '10h',
          allTime: '2,500h',
        },
      });
      expect(parsed.username).toBe('ProGamer');
      expect(parsed.achievements).toBe(30);
      expect(parsed.hoursOverview?.monthly).toBe('400h');
    });

    it('rejects oversized usernames', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          username: 'A'.repeat(50),
        })
      ).toThrow();
    });

    it('rejects negative counters', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          achievements: -5,
        })
      ).toThrow();
    });

    it('rejects invalid avatar URLs', () => {
      expect(() =>
        VoiceProfileInputSchema.parse({
          avatarUrl: 'not-a-valid-url',
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

    it('rejects empty entries list', () => {
      expect(() =>
        VoiceLeaderboardInputSchema.parse({
          entries: [],
        })
      ).toThrow();
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
