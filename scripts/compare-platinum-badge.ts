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
  await rankAssetCache.initialize();

  // 1. Render Profile with Platinum
  const profilePayload = {
    schemaVersion: '1.0',
    requestId: 'test-profile-plat',
    render: { templateId: 'profile-card-v1', format: 'png', scale: 1 },
    profile: { userId: 'u1', username: 'Anaya Roy' },
    rank: {
      current: { id: 'platinum', name: 'Platinum', minimumHours: 120, maximumHours: 155 },
      next: { id: 'diamond', name: 'Diamond', minimumHours: 155, maximumHours: 205 },
      progressPercent: 45,
    },
    counters: { achievements: 10, goals: 5, milestones: 2 },
    leaderboard: { rank: 6, topPercent: 5, trendValues: [10, 15, 20, 25] },
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
    hours: {
      monthly: { label: 'Oct', durationMinutes: 11580 },
      weekly: { label: 'W42', durationMinutes: 2000 },
      daily: { label: 'Today', durationMinutes: 300 },
      allTime: { label: 'All', durationMinutes: 50000 },
    },
    timeBreakdown: { camMinutes: 30000, nonCamMinutes: 20000 },
  };

  const vProfile = voiceProfileModule.validate(profilePayload);
  const ctxProfile = createRenderContext('profile-card-v1');
  const profilePng = await voiceProfileModule.render(vProfile, ctxProfile);

  // 2. Render Leaderboard with Platinum
  const leaderboardPayload = {
    schemaVersion: '1.0',
    requestId: 'test-lb-plat',
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1 },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, username: 'Aarav', durationMinutes: 19260, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 2, username: 'Sakha', durationMinutes: 17040, rank: { id: 'gold', name: 'Gold' } },
        { position: 3, username: 'Mira', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond' } },
        { position: 4, username: 'PixelDreams', durationMinutes: 13680, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 5, username: 'Kabir', durationMinutes: 12420, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 6, username: 'Anaya', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 7, username: 'Dev', durationMinutes: 10560, rank: { id: 'platinum', name: 'Platinum' } },
        { position: 8, username: 'Isha', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold' } },
        { position: 9, username: 'Neel', durationMinutes: 8940, rank: { id: 'gold', name: 'Gold' } },
        { position: 10, username: 'Tara', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver' } },
        { position: 11, username: 'HexCode', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze' } },
      ],
    },
  };

  const vLB = voiceLeaderboardModule.validate(leaderboardPayload);
  const ctxLB = createRenderContext('study-leaderboard-v1');
  const lbPng = await voiceLeaderboardModule.render(vLB, ctxLB);

  // 3. Crops
  // a) Profile Header Platinum (60x60 centered at x: 522, y: 123)
  const profileHeaderCrop = await sharp(profilePng)
    .extract({ left: 492, top: 93, width: 60, height: 60 })
    .toBuffer();

  // b) Profile Progression Platinum (40x40 centered at x: 316, y: 579)
  const profileProgCrop = await sharp(profilePng)
    .extract({ left: 296, top: 559, width: 42, height: 42 })
    .toBuffer();

  // c) Leaderboard Row 6 Platinum Pill (x: 496, y: 830, w: 140, h: 42)
  const lbRowCrop = await sharp(lbPng)
    .extract({ left: 490, top: 825, width: 170, height: 52 })
    .toBuffer();

  // d) Leaderboard Podium #1 Platinum Pill (cx: 771, y: 457, w ~ 170, h: 45)
  const lbPodiumCrop = await sharp(lbPng)
    .extract({ left: 680, top: 452, width: 185, height: 55 })
    .toBuffer();

  // 4. Save full outputs and individual crops
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'profile-clean2x-full.png'), profilePng);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'lb-clean2x-full.png'), lbPng);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'crop-profile-header-platinum.png'), profileHeaderCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'crop-profile-prog-platinum.png'), profileProgCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'crop-lb-row-platinum.png'), lbRowCrop);
  fs.writeFileSync(resolve(ARTIFACT_DIR, 'crop-lb-podium-platinum.png'), lbPodiumCrop);

  // 5. Create a side-by-side composite comparison card
  const compositeCard = sharp({
    create: {
      width: 760,
      height: 420,
      channels: 4,
      background: { r: 247, g: 247, b: 248, alpha: 1 },
    },
  });

  // Create an SVG overlay with titles and borders
  const compositeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="420" viewBox="0 0 760 420">
    <rect width="760" height="420" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
    <text x="380" y="38" font-family="Nunito Sans, Arial" font-size="18" font-weight="800" fill="#0F172A" text-anchor="middle">
      Rank Icon Visual Parity: Voice Profile vs Voice Leaderboard (1x Resvg, 2x Clean Lanczos3)
    </text>

    <!-- Column 1: Voice Profile Badges -->
    <rect x="30" y="55" width="335" height="340" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" />
    <text x="197" y="85" font-family="Nunito Sans, Arial" font-size="16" font-weight="700" fill="#2563EB" text-anchor="middle">
      VOICE PROFILE
    </text>
    
    <text x="50" y="118" font-family="Nunito Sans, Arial" font-size="13" font-weight="600" fill="#64748B">
      Header Badge (60px in SVG, 120px injected):
    </text>
    <rect x="50" y="130" width="295" height="95" rx="8" fill="#F1F5F9" />

    <text x="50" y="258" font-family="Nunito Sans, Arial" font-size="13" font-weight="600" fill="#64748B">
      Progression Badge (40px in SVG, 80px injected):
    </text>
    <rect x="50" y="270" width="295" height="95" rx="8" fill="#F1F5F9" />

    <!-- Column 2: Voice Leaderboard Badges -->
    <rect x="395" y="55" width="335" height="340" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" />
    <text x="562" y="85" font-family="Nunito Sans, Arial" font-size="16" font-weight="700" fill="#16A34A" text-anchor="middle">
      VOICE LEADERBOARD
    </text>

    <text x="415" y="118" font-family="Nunito Sans, Arial" font-size="13" font-weight="600" fill="#64748B">
      Podium Rank Pill (40px in SVG, 80px injected):
    </text>
    <rect x="415" y="130" width="295" height="95" rx="8" fill="#F1F5F9" />

    <text x="415" y="258" font-family="Nunito Sans, Arial" font-size="13" font-weight="600" fill="#64748B">
      Table Row Pill (36px in SVG, 80px injected):
    </text>
    <rect x="415" y="270" width="295" height="95" rx="8" fill="#F1F5F9" />
  </svg>`;

  const svgBuffer = Buffer.from(compositeSvg);

  const compositePng = await compositeCard
    .composite([
      { input: svgBuffer, top: 0, left: 0 },
      { input: profileHeaderCrop, top: 147, left: 167 },
      { input: profileProgCrop, top: 296, left: 176 },
      { input: lbPodiumCrop, top: 150, left: 450 },
      { input: lbRowCrop, top: 291, left: 458 },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(resolve(ARTIFACT_DIR, 'comparison-profile-vs-leaderboard-badges.png'), compositePng);
  console.log('Saved comparison-profile-vs-leaderboard-badges.png to artifact directory');
}

main().catch(console.error);
