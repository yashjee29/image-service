import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { voiceLeaderboardModule } from '/Users/yashjee/HexaDev/Projects/CASH/image-service/src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '/Users/yashjee/HexaDev/Projects/CASH/image-service/src/core/renderer/renderer.factory.js';
import { fontRegistry } from '/Users/yashjee/HexaDev/Projects/CASH/image-service/src/core/fonts/font-registry.js';
import { rankAssetCache } from '/Users/yashjee/HexaDev/Projects/CASH/image-service/src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '/Users/yashjee/HexaDev/Projects/CASH/image-service/src/core/images/leaderboard-asset-cache.js';

async function main() {
  fontRegistry.initialize();
  await rankAssetCache.initialize(256);
  await leaderboardAssetCache.initialize(160);

  // 1. User's exact prompt payload (Ranks 1 to 11 -> study-leaderboard-2.svg)
  const userPayload = {
    schemaVersion: "1.0",
    requestId: "leaderboard-render-001",
    render: {
      templateId: "study-leaderboard-v1",
      format: "png",
      scale: 1,
    },
    filters: {
      period: "monthly",
      metric: "cam"
    },
    leaderboard: {
      range: {
        startPosition: 1,
        endPosition: 11
      },
      totalParticipants: 25,
      entries: [
        {
          position: 1,
          userId: "user-001",
          username: "Aarav",
          avatarUrl: "https://cdn.example.com/avatars/aarav.png",
          durationMinutes: 19260, // 321h
          rank: {
            id: "immortal",
            name: "Immortal",
            assetKey: "rank-immortal"
          }
        },
        {
          position: 2,
          userId: "user-002",
          username: "Sakha",
          avatarUrl: "https://cdn.example.com/avatars/sakha.png",
          durationMinutes: 17040, // 284h
          rank: {
            id: "ascendant",
            name: "Ascendant",
            assetKey: "rank-ascendant"
          }
        },
        {
          position: 3,
          userId: "user-003",
          username: "Mira",
          avatarUrl: "https://cdn.example.com/avatars/mira.png",
          durationMinutes: 15060, // 251h
          rank: {
            id: "diamond",
            name: "Diamond",
            assetKey: "rank-diamond"
          }
        },
        {
          position: 4,
          userId: "user-004",
          username: "PixelDreams",
          avatarUrl: "https://cdn.example.com/avatars/pixeldreams.png",
          durationMinutes: 13680, // 228h
          rank: {
            id: "diamond",
            name: "Diamond",
            assetKey: "rank-diamond"
          }
        },
        {
          position: 5,
          userId: "user-005",
          username: "Kabir",
          avatarUrl: "https://cdn.example.com/avatars/kabir.png",
          durationMinutes: 12420, // 207h
          rank: {
            id: "diamond",
            name: "Diamond",
            assetKey: "rank-diamond"
          }
        },
        {
          position: 6,
          userId: "user-006",
          username: "Anaya",
          avatarUrl: "https://cdn.example.com/avatars/anaya.png",
          durationMinutes: 11580, // 193h
          rank: {
            id: "platinum",
            name: "Platinum",
            assetKey: "rank-platinum"
          }
        },
        {
          position: 7,
          userId: "user-007",
          username: "Dev",
          avatarUrl: "https://cdn.example.com/avatars/dev.png",
          durationMinutes: 10560, // 176h
          rank: {
            id: "gold",
            name: "Gold",
            assetKey: "rank-gold"
          }
        },
        {
          position: 8,
          userId: "user-008",
          username: "Isha",
          avatarUrl: "https://cdn.example.com/avatars/isha.png",
          durationMinutes: 9840, // 164h
          rank: {
            id: "gold",
            name: "Gold",
            assetKey: "rank-gold"
          }
        },
        {
          position: 9,
          userId: "user-009",
          username: "Neel",
          avatarUrl: "https://cdn.example.com/avatars/neel.png",
          durationMinutes: 8940, // 149h
          rank: {
            id: "silver",
            name: "Silver",
            assetKey: "rank-silver"
          }
        },
        {
          position: 10,
          userId: "user-010",
          username: "Tara",
          avatarUrl: "https://cdn.example.com/avatars/tara.png",
          durationMinutes: 7920, // 132h
          rank: {
            id: "silver",
            name: "Silver",
            assetKey: "rank-silver"
          }
        },
        {
          position: 11,
          userId: "user-011",
          username: "HexCode",
          avatarUrl: "https://cdn.example.com/avatars/hexcode.png",
          durationMinutes: 7260, // 121h
          rank: {
            id: "bronze",
            name: "Bronze",
            assetKey: "rank-bronze"
          }
        }
      ]
    }
  };

  const validated1 = voiceLeaderboardModule.validate(userPayload);
  const context1 = createRenderContext('study-leaderboard-v1');
  const buffer1 = await voiceLeaderboardModule.render(validated1, context1);
  const out1 = resolve('/Users/yashjee/.gemini/antigravity/brain/75dc9269-ca96-4f35-aca9-3f636ae517b3', 'study-leaderboard-page1-output.png');
  writeFileSync(out1, buffer1);
  console.log(`Saved Page 1 (ranks 1-11) to: ${out1}`);

  // 2. Ranks > 11 Payload (Ranks 12 to 25 -> study-leaderboard.svg)
  const page2Payload = {
    schemaVersion: "1.0",
    requestId: "leaderboard-render-002",
    render: {
      templateId: "study-leaderboard-v1",
      format: "png",
      scale: 1,
    },
    filters: {
      period: "monthly",
      metric: "cam"
    },
    leaderboard: {
      range: {
        startPosition: 12,
        endPosition: 25
      },
      totalParticipants: 25,
      entries: [
        { position: 12, username: "Riya", durationMinutes: 7080, rank: { id: "platinum", name: "Platinum" } },
        { position: 13, username: "Aryan", durationMinutes: 6900, rank: { id: "gold", name: "Gold" } },
        { position: 14, username: "Meera", durationMinutes: 6720, rank: { id: "gold", name: "Gold" } },
        { position: 15, username: "Rohit", durationMinutes: 6120, rank: { id: "silver", name: "Silver" } },
        { position: 16, username: "Siya", durationMinutes: 5760, rank: { id: "silver", name: "Silver" } },
        { position: 17, username: "Vivaan", durationMinutes: 5460, rank: { id: "silver", name: "Silver" } },
        { position: 18, username: "Naina", durationMinutes: 5100, rank: { id: "bronze", name: "Bronze" } },
        { position: 19, username: "Arjun", durationMinutes: 4680, rank: { id: "bronze", name: "Bronze" } },
        { position: 20, username: "Kavya", durationMinutes: 4320, rank: { id: "bronze", name: "Bronze" } },
        { position: 21, username: "Manav", durationMinutes: 3960, rank: { id: "iron", name: "Iron" } },
        { position: 22, username: "Zara", durationMinutes: 3540, rank: { id: "iron", name: "Iron" } },
        { position: 23, username: "Yash", durationMinutes: 3180, rank: { id: "iron", name: "Iron", isCurrentUser: true } },
        { position: 24, username: "Aanya", durationMinutes: 2880, rank: { id: "unrated", name: "Unrated" } },
        { position: 25, username: "Harsh", durationMinutes: 2640, rank: { id: "unrated", name: "Unrated" } },
      ]
    }
  };

  const validated2 = voiceLeaderboardModule.validate(page2Payload);
  const context2 = createRenderContext('study-leaderboard-v1');
  const buffer2 = await voiceLeaderboardModule.render(validated2, context2);
  const out2 = resolve('/Users/yashjee/.gemini/antigravity/brain/75dc9269-ca96-4f35-aca9-3f636ae517b3', 'study-leaderboard-page2-output.png');
  writeFileSync(out2, buffer2);
  console.log(`Saved Page 2 (ranks 12-25) to: ${out2}`);
}

main().catch(console.error);
