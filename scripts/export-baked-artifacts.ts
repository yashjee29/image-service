import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { renderVoiceLeaderboard } from '../src/modules/voice-leaderboard/renderer.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';
import { writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

async function exportArtifacts() {
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  // 1. Podium Layout (Ranks 1 - 11, requester Sakha #2)
  const podiumPayload = {
    schemaVersion: '1.0',
    requestId: 'leaderboard-render-001',
    requestContext: { requesterUserId: 'user-002' },
    render: { templateId: 'study-leaderboard-v1', format: 'png', scale: 1, layout: 'podium_and_list', highlightRequester: true },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 1, endPosition: 11 },
      totalParticipants: 25,
      entries: [
        { position: 1, userId: 'user-001', username: 'Aarav', avatarUrl: 'https://cdn.example.com/avatars/aarav.png', durationMinutes: 19260, rank: { id: 'immortal', name: 'Immortal', assetKey: 'rank-immortal' } },
        { position: 2, userId: 'user-002', username: 'Sakha', avatarUrl: 'https://cdn.example.com/avatars/sakha.png', durationMinutes: 17040, rank: { id: 'ascendant', name: 'Ascendant', assetKey: 'rank-ascendant' } },
        { position: 3, userId: 'user-003', username: 'Mira', avatarUrl: 'https://cdn.example.com/avatars/mira.png', durationMinutes: 15060, rank: { id: 'diamond', name: 'Diamond', assetKey: 'rank-diamond' } },
        { position: 4, userId: 'user-004', username: 'PixelDreams', avatarUrl: 'https://cdn.example.com/avatars/pixeldreams.png', durationMinutes: 13680, rank: { id: 'diamond', name: 'Diamond', assetKey: 'rank-diamond' } },
        { position: 5, userId: 'user-005', username: 'Kabir', avatarUrl: 'https://cdn.example.com/avatars/kabir.png', durationMinutes: 12420, rank: { id: 'diamond', name: 'Diamond', assetKey: 'rank-diamond' } },
        { position: 6, userId: 'user-006', username: 'Anaya', avatarUrl: 'https://cdn.example.com/avatars/anaya.png', durationMinutes: 11580, rank: { id: 'platinum', name: 'Platinum', assetKey: 'rank-platinum' } },
        { position: 7, userId: 'user-007', username: 'Dev', avatarUrl: 'https://cdn.example.com/avatars/dev.png', durationMinutes: 10560, rank: { id: 'gold', name: 'Gold', assetKey: 'rank-gold' } },
        { position: 8, userId: 'user-008', username: 'Isha', avatarUrl: 'https://cdn.example.com/avatars/isha.png', durationMinutes: 9840, rank: { id: 'gold', name: 'Gold', assetKey: 'rank-gold' } },
        { position: 9, userId: 'user-009', username: 'Neel', avatarUrl: 'https://cdn.example.com/avatars/neel.png', durationMinutes: 8940, rank: { id: 'silver', name: 'Silver', assetKey: 'rank-silver' } },
        { position: 10, userId: 'user-010', username: 'Tara', avatarUrl: 'https://cdn.example.com/avatars/tara.png', durationMinutes: 7920, rank: { id: 'silver', name: 'Silver', assetKey: 'rank-silver' } },
        { position: 11, userId: 'user-011', username: 'HexCode', avatarUrl: 'https://cdn.example.com/avatars/hexcode.png', durationMinutes: 7260, rank: { id: 'bronze', name: 'Bronze', assetKey: 'rank-bronze' } },
      ],
    },
  };

  const validatedPodium = voiceLeaderboardModule.validate(podiumPayload);
  const podiumContext = createRenderContext('study-leaderboard-2');
  const podiumPng = await renderVoiceLeaderboard(validatedPodium, podiumContext);

  const localPodiumPath = resolve(process.cwd(), 'artifacts/study-leaderboard-podium-optimized.png');
  const artifactPodiumPath = resolve(ARTIFACT_DIR, 'study-leaderboard-podium-optimized.png');
  writeFileSync(localPodiumPath, podiumPng);
  copyFileSync(localPodiumPath, artifactPodiumPath);
  console.log(`Saved podium artifact to ${artifactPodiumPath}`);

  // 2. Nearby Ranks Slice (Ranks 12 - 25, requester Meera #14)
  const nearbyPayload = {
    schemaVersion: '1.0',
    requestId: 'leaderboard-render-nearby',
    requestContext: { requesterUserId: 'user-014' },
    render: { templateId: 'study-leaderboard', format: 'png', scale: 1, layout: 'list', highlightRequester: true },
    filters: { period: 'monthly', metric: 'cam' },
    leaderboard: {
      range: { startPosition: 12, endPosition: 25 },
      totalParticipants: 25,
      entries: [
        { position: 12, userId: 'user-012', username: 'Riya', avatarUrl: 'https://cdn.example.com/avatars/riya.png', durationMinutes: 7080, rank: { id: 'platinum', name: 'Platinum', assetKey: 'rank-platinum' } },
        { position: 13, userId: 'user-013', username: 'Aryan', avatarUrl: 'https://cdn.example.com/avatars/aryan.png', durationMinutes: 6840, rank: { id: 'platinum', name: 'Platinum', assetKey: 'rank-platinum' } },
        { position: 14, userId: 'user-014', username: 'Meera', avatarUrl: 'https://cdn.example.com/avatars/meera.png', durationMinutes: 6600, rank: { id: 'gold', name: 'Gold', assetKey: 'rank-gold' } },
        { position: 15, userId: 'user-015', username: 'Rohit', avatarUrl: 'https://cdn.example.com/avatars/rohit.png', durationMinutes: 6360, rank: { id: 'gold', name: 'Gold', assetKey: 'rank-gold' } },
        { position: 16, userId: 'user-016', username: 'Siya', avatarUrl: 'https://cdn.example.com/avatars/siya.png', durationMinutes: 6120, rank: { id: 'gold', name: 'Gold', assetKey: 'rank-gold' } },
        { position: 17, userId: 'user-017', username: 'Vivaan', avatarUrl: 'https://cdn.example.com/avatars/vivaan.png', durationMinutes: 5880, rank: { id: 'silver', name: 'Silver', assetKey: 'rank-silver' } },
        { position: 18, userId: 'user-018', username: 'Naina', avatarUrl: 'https://cdn.example.com/avatars/naina.png', durationMinutes: 5640, rank: { id: 'silver', name: 'Silver', assetKey: 'rank-silver' } },
        { position: 19, userId: 'user-019', username: 'Arjun', avatarUrl: 'https://cdn.example.com/avatars/arjun.png', durationMinutes: 5400, rank: { id: 'silver', name: 'Silver', assetKey: 'rank-silver' } },
        { position: 20, userId: 'user-020', username: 'Kavya', avatarUrl: 'https://cdn.example.com/avatars/kavya.png', durationMinutes: 5160, rank: { id: 'bronze', name: 'Bronze', assetKey: 'rank-bronze' } },
        { position: 21, userId: 'user-021', username: 'Manav', avatarUrl: 'https://cdn.example.com/avatars/manav.png', durationMinutes: 4920, rank: { id: 'bronze', name: 'Bronze', assetKey: 'rank-bronze' } },
        { position: 22, userId: 'user-022', username: 'Zara', avatarUrl: 'https://cdn.example.com/avatars/zara.png', durationMinutes: 4680, rank: { id: 'bronze', name: 'Bronze', assetKey: 'rank-bronze' } },
        { position: 23, userId: 'user-023', username: 'Yash', avatarUrl: 'https://cdn.example.com/avatars/yash.png', durationMinutes: 4440, rank: { id: 'iron', name: 'Iron', assetKey: 'rank-iron' } },
        { position: 24, userId: 'user-024', username: 'Aanya', avatarUrl: 'https://cdn.example.com/avatars/aanya.png', durationMinutes: 4200, rank: { id: 'iron', name: 'Iron', assetKey: 'rank-iron' } },
        { position: 25, userId: 'user-025', username: 'Harsh', avatarUrl: 'https://cdn.example.com/avatars/harsh.png', durationMinutes: 3960, rank: { id: 'iron', name: 'Iron', assetKey: 'rank-iron' } },
      ],
    },
  };

  const validatedNearby = voiceLeaderboardModule.validate(nearbyPayload);
  const nearbyContext = createRenderContext('study-leaderboard');
  const nearbyPng = await renderVoiceLeaderboard(validatedNearby, nearbyContext);

  const localNearbyPath = resolve(process.cwd(), 'artifacts/study-leaderboard-nearby-optimized.png');
  const artifactNearbyPath = resolve(ARTIFACT_DIR, 'study-leaderboard-nearby-optimized.png');
  writeFileSync(localNearbyPath, nearbyPng);
  copyFileSync(localNearbyPath, artifactNearbyPath);
  console.log(`Saved nearby artifact to ${artifactNearbyPath}`);
}

exportArtifacts().catch(console.error);
