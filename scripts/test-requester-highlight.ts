import fs from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { fontRegistry } from '../src/core/fonts/font-registry.js';
import { rankAssetCache } from '../src/core/images/rank-asset-cache.js';
import { leaderboardAssetCache } from '../src/core/images/leaderboard-asset-cache.js';
import { voiceLeaderboardModule } from '../src/modules/voice-leaderboard/index.js';
import { createRenderContext } from '../src/core/renderer/renderer.factory.js';

const PROJECT_ARTIFACTS_DIR = resolve(process.cwd(), 'artifacts');
const SESSION_ARTIFACTS_DIR = '/Users/yashjee/.gemini/antigravity/brain/558b160c-a309-418a-849c-7b34546f9026';

if (!fs.existsSync(PROJECT_ARTIFACTS_DIR)) {
  fs.mkdirSync(PROJECT_ARTIFACTS_DIR, { recursive: true });
}

// Exact payload provided by the user
const userPayloadPodiumHighlight = {
  schemaVersion: '1.0',
  requestId: 'leaderboard-render-001',
  requestContext: {
    requesterUserId: 'user-002',
  },
  render: {
    templateId: 'study-leaderboard-v1',
    format: 'png',
    scale: 1,
    layout: 'podium_and_list',
    highlightRequester: true,
  },
  filters: {
    period: 'monthly',
    metric: 'cam',
  },
  leaderboard: {
    range: {
      startPosition: 1,
      endPosition: 11,
    },
    totalParticipants: 25,
    entries: [
      {
        position: 1,
        userId: 'user-001',
        username: 'Aarav',
        avatarUrl: 'https://cdn.example.com/avatars/aarav.png',
        durationMinutes: 19260,
        rank: {
          id: 'immortal',
          name: 'Immortal',
          assetKey: 'rank-immortal',
        },
      },
      {
        position: 2,
        userId: 'user-002',
        username: 'Sakha',
        avatarUrl: 'https://cdn.example.com/avatars/sakha.png',
        durationMinutes: 17040,
        rank: {
          id: 'ascendant',
          name: 'Ascendant',
          assetKey: 'rank-ascendant',
        },
      },
      {
        position: 3,
        userId: 'user-003',
        username: 'Mira',
        avatarUrl: 'https://cdn.example.com/avatars/mira.png',
        durationMinutes: 15060,
        rank: {
          id: 'diamond',
          name: 'Diamond',
          assetKey: 'rank-diamond',
        },
      },
      {
        position: 4,
        userId: 'user-004',
        username: 'PixelDreams',
        avatarUrl: 'https://cdn.example.com/avatars/pixeldreams.png',
        durationMinutes: 13680,
        rank: {
          id: 'diamond',
          name: 'Diamond',
          assetKey: 'rank-diamond',
        },
      },
      {
        position: 5,
        userId: 'user-005',
        username: 'Kabir',
        avatarUrl: 'https://cdn.example.com/avatars/kabir.png',
        durationMinutes: 12420,
        rank: {
          id: 'diamond',
          name: 'Diamond',
          assetKey: 'rank-diamond',
        },
      },
      {
        position: 6,
        userId: 'user-006',
        username: 'Anaya',
        avatarUrl: 'https://cdn.example.com/avatars/anaya.png',
        durationMinutes: 11580,
        rank: {
          id: 'platinum',
          name: 'Platinum',
          assetKey: 'rank-platinum',
        },
      },
      {
        position: 7,
        userId: 'user-007',
        username: 'Dev',
        avatarUrl: 'https://cdn.example.com/avatars/dev.png',
        durationMinutes: 10560,
        rank: {
          id: 'gold',
          name: 'Gold',
          assetKey: 'rank-gold',
        },
      },
      {
        position: 8,
        userId: 'user-008',
        username: 'Isha',
        avatarUrl: 'https://cdn.example.com/avatars/isha.png',
        durationMinutes: 9840,
        rank: {
          id: 'gold',
          name: 'Gold',
          assetKey: 'rank-gold',
        },
      },
      {
        position: 9,
        userId: 'user-009',
        username: 'Neel',
        avatarUrl: 'https://cdn.example.com/avatars/neel.png',
        durationMinutes: 8940,
        rank: {
          id: 'silver',
          name: 'Silver',
          assetKey: 'rank-silver',
        },
      },
      {
        position: 10,
        userId: 'user-010',
        username: 'Tara',
        avatarUrl: 'https://cdn.example.com/avatars/tara.png',
        durationMinutes: 7920,
        rank: {
          id: 'silver',
          name: 'Silver',
          assetKey: 'rank-silver',
        },
      },
      {
        position: 11,
        userId: 'user-011',
        username: 'HexCode',
        avatarUrl: 'https://cdn.example.com/avatars/hexcode.png',
        durationMinutes: 7260,
        rank: {
          id: 'bronze',
          name: 'Bronze',
          assetKey: 'rank-bronze',
        },
      },
    ],
  },
};

// Row highlight test: Kabir at Rank 5
const userPayloadRowHighlight = {
  ...userPayloadPodiumHighlight,
  requestId: 'leaderboard-render-row-highlight',
  requestContext: {
    requesterUserId: 'user-005',
  },
};

async function run() {
  console.log('Initializing fonts and caches...');
  fontRegistry.initialize();
  await rankAssetCache.initialize();
  await leaderboardAssetCache.initialize();

  const context = createRenderContext('study-leaderboard-2');

  // 1. Render Podium Highlight (user-002, Sakha #2)
  console.log('Rendering Podium Highlight (user-002, Sakha #2)...');
  const validated1 = voiceLeaderboardModule.validate(userPayloadPodiumHighlight);
  const png1 = await voiceLeaderboardModule.render(validated1, context);

  const out1Project = resolve(PROJECT_ARTIFACTS_DIR, 'requester-highlight-podium-sakha.png');
  const out1Session = resolve(SESSION_ARTIFACTS_DIR, 'requester-highlight-podium-sakha.png');
  fs.writeFileSync(out1Project, png1);
  fs.writeFileSync(out1Session, png1);
  console.log(`Saved podium highlight render to ${out1Project}`);

  // 2. Render Row Highlight (user-005, Kabir #5)
  console.log('Rendering Row Highlight (user-005, Kabir #5)...');
  const validated2 = voiceLeaderboardModule.validate(userPayloadRowHighlight);
  const png2 = await voiceLeaderboardModule.render(validated2, context);

  const out2Project = resolve(PROJECT_ARTIFACTS_DIR, 'requester-highlight-row-kabir.png');
  const out2Session = resolve(SESSION_ARTIFACTS_DIR, 'requester-highlight-row-kabir.png');
  fs.writeFileSync(out2Project, png2);
  fs.writeFileSync(out2Session, png2);
  console.log(`Saved row highlight render to ${out2Project}`);

  // 3. Extract 1:1 Crops for precise visual inspection
  // Podium card 2 crop: x=170, y=160, w=380, h=470
  const cropPodiumSakha = await sharp(png1)
    .extract({ left: 170, top: 160, width: 380, height: 470 })
    .png()
    .toBuffer();
  fs.writeFileSync(resolve(PROJECT_ARTIFACTS_DIR, 'crop-requester-podium-sakha.png'), cropPodiumSakha);
  fs.writeFileSync(resolve(SESSION_ARTIFACTS_DIR, 'crop-requester-podium-sakha.png'), cropPodiumSakha);

  // Table row 5 (Kabir) crop: x=135, y=730, w=610, h=75
  const cropRowKabir = await sharp(png2)
    .extract({ left: 135, top: 730, width: 610, height: 75 })
    .png()
    .toBuffer();
  fs.writeFileSync(resolve(PROJECT_ARTIFACTS_DIR, 'crop-requester-row-kabir.png'), cropRowKabir);
  fs.writeFileSync(resolve(SESSION_ARTIFACTS_DIR, 'crop-requester-row-kabir.png'), cropRowKabir);

  // Side-by-side comparison of normal row 4 vs highlighted row 5
  const cropRows4and5 = await sharp(png2)
    .extract({ left: 135, top: 650, width: 610, height: 160 })
    .png()
    .toBuffer();
  fs.writeFileSync(resolve(PROJECT_ARTIFACTS_DIR, 'crop-comparison-normal-vs-highlighted-row.png'), cropRows4and5);
  fs.writeFileSync(resolve(SESSION_ARTIFACTS_DIR, 'crop-comparison-normal-vs-highlighted-row.png'), cropRows4and5);

  console.log('All highlight artifacts rendered successfully!');
}

run().catch((err) => {
  console.error('Error rendering highlight test:', err);
  process.exit(1);
});
