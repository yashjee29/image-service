import sharp from 'sharp';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { voiceProfileModule } from '../src/modules/voice-profile/index.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';

const ARTIFACT_DIR = resolve(process.cwd(), 'artifacts');

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize(); // 80px & 120px
  await leaderboardAssetCache.initialize(92); // 92px

  // 1. Profile with Ascendant & Immortal
  const profilePayload = {
    schemaVersion: '1.0',
    requestId: 'diag-profile-001',
    render: { templateId: 'profile-card-v1', format: 'png', scale: 1 },
    profile: { userId: 'u1', username: 'Sakha' },
    rank: {
      current: { id: 'ascendant', name: 'Ascendant', minimumHours: 205, maximumHours: 280 },
      next: { id: 'immortal', name: 'Immortal', minimumHours: 280, maximumHours: 350 },
      progressPercent: 50,
    },
    counters: { achievements: 10, goals: 5, milestones: 2 },
    leaderboard: { rank: 1, topPercent: 1, trendValues: [10, 20, 30, 40] },
    activity: {
      periodLabel: 'LAST 7 DAYS',
      entries: [
        { label: 'Mon', durationMinutes: 100 },
        { label: 'Tue', durationMinutes: 120 },
        { label: 'Wed', durationMinutes: 80 },
        { label: 'Thu', durationMinutes: 140 },
        { label: 'Fri', durationMinutes: 110 },
        { label: 'Sat', durationMinutes: 90 },
        { label: 'Sun', durationMinutes: 130, isCurrentDay: true },
      ],
    },
    hours: { monthly: { label: 'Oct', durationMinutes: 1000 }, weekly: { label: 'W1', durationMinutes: 200 }, daily: { label: 'Today', durationMinutes: 50 }, allTime: { label: 'All', durationMinutes: 5000 } },
    timeBreakdown: { camMinutes: 3000, nonCamMinutes: 2000 }
  };

  const vP = voiceProfileModule.validate(profilePayload);
  const cP = createRenderContext('profile-card-v1');
  const profilePng = await voiceProfileModule.render(vP, cP);

  // 2. Leaderboard with Ascendant & Immortal
  const leaderboardPayload = {
    schemaVersion: '1.0',
    requestId: 'diag-lb-001',
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1 },
    title: 'Study Leaderboard',
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav Sharma', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' }, isCurrentUser: true },
        { position: 3, username: 'Mira K.', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 5, username: 'Kabir V.', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 6, username: 'Anaya Roy', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev Patel', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold' } },
        { position: 8, username: 'Isha Gupta', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel Mehta', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver' } },
        { position: 10, username: 'Tara Sen', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  const vL = voiceLeaderboardModule.validate(leaderboardPayload);
  const cL = createRenderContext('study-leaderboard-v1');
  const lbPng = await voiceLeaderboardModule.render(vL, cL);

  // Extract crops:
  // a) Profile progression Ascendant (40x40 at x: 316, y: 579)
  const profAscCrop = await sharp(profilePng).extract({ left: 296, top: 559, width: 42, height: 42 }).toBuffer();
  // b) Profile progression Immortal (40x40 next badge)
  const profImmCrop = await sharp(profilePng).extract({ left: 540, top: 559, width: 42, height: 42 }).toBuffer();

  // c) Leaderboard podium card 2 Ascendant pill (cx: 363, y: 457, pillW: ~170, h: 45)
  const lbAscCrop = await sharp(lbPng).extract({ left: 270, top: 450, width: 190, height: 60 }).toBuffer();
  // d) Leaderboard podium card 1 Immortal pill (cx: 771, y: 457, pillW: ~170, h: 45)
  const lbImmCrop = await sharp(lbPng).extract({ left: 680, top: 450, width: 185, height: 60 }).toBuffer();

  // e) Leaderboard podium top pill #2 (Silver medal)
  const lbMedal2Crop = await sharp(lbPng).extract({ left: 295, top: 168, width: 135, height: 60 }).toBuffer();
  // f) Leaderboard podium top pill #1 (Gold medal)
  const lbMedal1Crop = await sharp(lbPng).extract({ left: 700, top: 156, width: 148, height: 60 }).toBuffer();

  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-prof-asc.png'), profAscCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-lb-asc.png'), lbAscCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-prof-imm.png'), profImmCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-lb-imm.png'), lbImmCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-lb-medal-2.png'), lbMedal2Crop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'diag-lb-medal-1.png'), lbMedal1Crop);

  console.log('Saved all diagnostic crops to artifacts/');
}

main().catch(console.error);
