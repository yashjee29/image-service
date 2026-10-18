import fs from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { voiceProfileModule } from '../src/modules/voice-profile/index.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';

const ARTIFACT_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

async function main() {
  fontRegistry.initialize();

  // Test across multiple sizes for rankAssetCache:
  // Size 1: 72px (exact 2x of 36px)
  // Size 2: 80px (exact 2x of 40px)
  // Size 3: 256px (current)
  for (const size of [72, 80, 120, 256]) {
    // Re-initialize cache with this size
    (rankAssetCache as any).initialized = false;
    (rankAssetCache as any).currentTargetSize = 0;
    (rankAssetCache as any).dataUris.clear();
    await rankAssetCache.initialize(size);

    // Render Profile with Platinum
    const pPayload = {
      schemaVersion: '1.0',
      requestId: `profile-${size}`,
      render: { templateId: 'profile-card-v1', format: 'png', scale: 1 },
      profile: { userId: 'u1', username: 'Sakha' },
      rank: {
        current: { id: 'platinum', name: 'Platinum', minimumHours: 120, maximumHours: 155 },
        next: { id: 'diamond', name: 'Diamond', minimumHours: 155, maximumHours: 205 },
        progressPercent: 50,
      },
      counters: { achievements: 10, goals: 5, milestones: 2 },
      leaderboard: { rank: 1, topPercent: 1, trendValues: [10, 15, 20, 25] },
      activity: {
        periodLabel: 'LAST 7 DAYS',
        entries: [
          { label: 'Mon', durationMinutes: 100 },
          { label: 'Tue', durationMinutes: 100 },
          { label: 'Wed', durationMinutes: 100 },
          { label: 'Thu', durationMinutes: 100 },
          { label: 'Fri', durationMinutes: 100 },
          { label: 'Sat', durationMinutes: 100 },
          { label: 'Sun', durationMinutes: 100, isCurrentDay: true },
        ],
      },
      hours: {
        monthly: { label: 'Oct', durationMinutes: 10000 },
        weekly: { label: 'W', durationMinutes: 2000 },
        daily: { label: 'T', durationMinutes: 300 },
        allTime: { label: 'A', durationMinutes: 50000 },
      },
      timeBreakdown: { camMinutes: 30000, nonCamMinutes: 20000 },
    };

    const vp = voiceProfileModule.validate(pPayload);
    const cp = createRenderContext('profile-card-v1');
    const pPng = await voiceProfileModule.render(vp, cp);

    // Render Leaderboard with Platinum
    const lbPayload = {
      schemaVersion: '1.0',
      requestId: `lb-${size}`,
      render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1 },
      filters: { period: 'monthly', metric: 'cam' },
      leaderboard: {
        range: { startPosition: 1, endPosition: 11 },
        totalParticipants: 25,
        entries: [
          { position: 1, username: 'Aarav', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal' } },
          { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant' } },
          { position: 3, username: 'Mira', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
          { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond' } },
          { position: 5, username: 'Kabir', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond' } },
          { position: 6, username: 'Anaya', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
          { position: 7, username: 'Dev', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold' } },
          { position: 8, username: 'Isha', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
          { position: 9, username: 'Neel', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver' } },
          { position: 10, username: 'Tara', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
          { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
        ],
      },
    };

    const vlb = voiceLeaderboardModule.validate(lbPayload);
    const clb = createRenderContext('study-leaderboard-v1');
    const lbPng = await voiceLeaderboardModule.render(vlb, clb);

    // Crop Profile Platinum Header Badge
    // Position in profile: username "Sakha", rank icon is next to it at x ~ 370-440, y ~ 90-155
    const profilePlatCrop = await sharp(pPng)
      .extract({ left: 360, top: 90, width: 90, height: 70 })
      .toBuffer();

    // Crop Leaderboard Platinum Row 6 Pill
    // Leaderboard row 6: pillX = 496, pillY = 824+6 = 830, pillW ~ 140, pillH = 42
    const lbPlatCrop = await sharp(lbPng)
      .extract({ left: 490, top: 825, width: 150, height: 50 })
      .toBuffer();

    fs.writeFileSync(resolve(ARTIFACT_DIR, `plat-profile-${size}px.png`), profilePlatCrop);
    fs.writeFileSync(resolve(ARTIFACT_DIR, `plat-leaderboard-${size}px.png`), lbPlatCrop);
    console.log(`Rendered and saved crops for cache size: ${size}px`);
  }
}

main().catch(console.error);
