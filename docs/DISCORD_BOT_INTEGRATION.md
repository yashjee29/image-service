# Discord Bot Integration Guide

This guide describes how to integrate your Discord bot with the Image Rendering Microservice for dynamic, high-performance Study and Voice Leaderboards.

---

## 1. Service Overview & Endpoint
- **URL**: `POST http://<image-service-host>:9100/api/v1/render`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <AUTH_TOKEN>` (optional, required only if `AUTH_ENABLED=true`)
- **Response**: Binary `image/png` stream with performance headers `X-Render-Time-Ms` (~15–30ms) and `X-Cache`.
- Attach the binary response directly to your Discord message using `AttachmentBuilder` (discord.js) or `discord.File` (discord.py).

---

## 2. Page Capacities & Layout Rules

The leaderboard uses two distinct layouts depending on the page number:

| Page | Layout | Total Users | Positions | Visual Structure |
| :--- | :--- | :--- | :--- | :--- |
| **Page 1** (Top) | `"podium_and_list"` | **Up to 11 users** | #1 – #11 | • Top: 3 large podium cards (#2, #1, #3) with rank medals & 160px avatars<br>• Bottom Left (Col 1): Ranks #4 – #7 (4 rows)<br>• Bottom Right (Col 2): Ranks #8 – #11 (4 rows) |
| **Page 2+** (List) | `"list"` | **Up to 14 users** | #12 – #25 (P2)<br>#26 – #39 (P3) | • Left Column: 7 rows<br>• Right Column: 7 rows |

> **Dynamic Empty Box Suppression**:
> If a server or page has fewer users than the capacity (e.g. only 1, 2, 3, or 5 users on Page 1, or 5 users on Page 2):
> - The image service automatically removes empty podium cards, empty column container boxes, and orphaned divider lines.
> - The boxes shrink to fit the exact row count. Never pass dummy placeholder users.

---

## 3. Pagination Math & Query Formulas

```typescript
// Total pages formula given total participants N:
function getTotalPages(totalParticipants: number): number {
  if (totalParticipants <= 11) return 1;
  return 1 + Math.ceil((totalParticipants - 11) / 14);
}

// Database query parameters for page P:
function getPageSlice(page: number): { offset: number; limit: number; layout: 'podium_and_list' | 'list' } {
  if (page === 1) {
    return { offset: 0, limit: 11, layout: 'podium_and_list' };
  }
  const offset = 11 + (page - 2) * 14;
  return { offset, limit: 14, layout: 'list' };
}

// If user wants to jump to their own position (requesterRank):
function getPageForRank(rank: number): number {
  if (rank <= 11) return 1;
  return 2 + Math.floor((rank - 12) / 14);
}
```

---

## 4. API Request Payloads

### A. Page 1 Request (Podium + List, Up to 11 Users)
```json
{
  "schemaVersion": "1.0",
  "requestId": "lb-guild123-p1",
  "requestContext": {
    "requesterUserId": "284910284719283712"
  },
  "render": {
    "templateId": "study-leaderboard-v1",
    "format": "png",
    "scale": 1,
    "layout": "podium_and_list",
    "highlightRequester": true
  },
  "filters": {
    "period": "monthly",
    "metric": "cam"
  },
  "leaderboard": {
    "range": {
      "startPosition": 1,
      "endPosition": 11
    },
    "totalParticipants": 45,
    "entries": [
      {
        "position": 1,
        "userId": "100000000000000001",
        "username": "Aarav",
        "avatarUrl": "https://cdn.discordapp.com/avatars/100000000000000001/avatar1.png?size=256",
        "durationMinutes": 19260,
        "rank": { "id": "immortal", "name": "Immortal" }
      },
      {
        "position": 2,
        "userId": "284910284719283712",
        "username": "Sakha",
        "avatarUrl": "https://cdn.discordapp.com/avatars/284910284719283712/avatar2.png?size=256",
        "durationMinutes": 17040,
        "rank": { "id": "ascendant", "name": "Ascendant" }
      },
      {
        "position": 3,
        "userId": "100000000000000003",
        "username": "Mira",
        "avatarUrl": "https://cdn.discordapp.com/avatars/100000000000000003/avatar3.png?size=256",
        "durationMinutes": 15060,
        "rank": { "id": "diamond", "name": "Diamond" }
      },
      {
        "position": 4,
        "userId": "100000000000000004",
        "username": "PixelDreams",
        "avatarUrl": "https://cdn.discordapp.com/avatars/100000000000000004/avatar4.png?size=128",
        "durationMinutes": 13680,
        "rank": { "id": "diamond", "name": "Diamond" }
      }
    ]
  }
}
```

### B. Page 2 Request (List Only, Up to 14 Users)
```json
{
  "schemaVersion": "1.0",
  "requestId": "lb-guild123-p2",
  "requestContext": {
    "requesterUserId": "284910284719283712"
  },
  "render": {
    "templateId": "study-leaderboard-v1",
    "format": "png",
    "scale": 1,
    "layout": "list",
    "highlightRequester": true
  },
  "filters": {
    "period": "monthly",
    "metric": "cam"
  },
  "leaderboard": {
    "range": {
      "startPosition": 12,
      "endPosition": 25
    },
    "totalParticipants": 45,
    "entries": [
      {
        "position": 12,
        "userId": "100000000000000012",
        "username": "Riya",
        "avatarUrl": "https://cdn.discordapp.com/avatars/100000000000000012/avatar12.png?size=128",
        "durationMinutes": 7080,
        "rank": { "id": "platinum", "name": "Platinum" }
      },
      {
        "position": 13,
        "userId": "100000000000000013",
        "username": "Aryan",
        "avatarUrl": "https://cdn.discordapp.com/avatars/100000000000000013/avatar13.png?size=128",
        "durationMinutes": 6900,
        "rank": { "id": "gold", "name": "Gold" }
      }
    ]
  }
}
```

---

## 5. Supported Rank IDs & Filter Values
- **Ranks**: `"radiant"`, `"immortal"`, `"ascendant"`, `"diamond"`, `"platinum"`, `"gold"`, `"silver"`, `"bronze"`, `"iron"`, `"unrated"`.
- **Metrics** (`filters.metric`):
  - `"cam"`: Displays Cam Hours icon (Emerald green camera badge).
  - `"voice"` or `"non-cam"`: Displays Voice Hours icon (Purple microphone badge).
  - `"both"` or `"total"`: Displays Both icon (Amber camera + soundwaves badge).
- **Periods** (`filters.period`): `"monthly"`, `"weekly"`, `"daily"`, or month names (e.g. `"October"`).
- **Requester Highlight**: When `requestContext.requesterUserId` matches a user in `entries`, their rank box and name are highlighted with warm aesthetic accents and bold text.

---

## 6. Implementation Example (Discord.js v14)

```typescript
import {
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ComponentType
} from 'discord.js';

export async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  let currentPage = interaction.options.getInteger('page') ?? 1;
  const period = interaction.options.getString('period') ?? 'monthly';
  const metric = interaction.options.getString('metric') ?? 'cam';
  const requesterId = interaction.user.id;

  // 1. Fetch total count from your database
  const totalCount = await db.getUserStudyCount({ period });
  const totalPages = Math.max(1, totalCount <= 11 ? 1 : 1 + Math.ceil((totalCount - 11) / 14));

  async function renderPage(page: number): Promise<{ buffer: Buffer; totalPages: number }> {
    // 2. Compute pagination slice
    const isFirstPage = page === 1;
    const limit = isFirstPage ? 11 : 14;
    const offset = isFirstPage ? 0 : 11 + (page - 2) * 14;
    const layout = isFirstPage ? 'podium_and_list' : 'list';

    // 3. Query your database for users in this range
    const users = await db.getLeaderboardUsers({ period, offset, limit });

    // 4. Construct payload for image-service
    const payload = {
      schemaVersion: '1.0',
      requestId: `lb-${interaction.guildId}-${interaction.id}-p${page}`,
      requestContext: { requesterUserId: requesterId },
      render: {
        templateId: 'study-leaderboard-v1',
        format: 'png',
        scale: 1,
        layout: layout,
        highlightRequester: true
      },
      filters: { period, metric },
      leaderboard: {
        range: {
          startPosition: users.length > 0 ? offset + 1 : 0,
          endPosition: users.length > 0 ? offset + users.length : 0
        },
        totalParticipants: totalCount,
        entries: users.map((u, idx) => ({
          position: offset + idx + 1,
          userId: u.id,
          username: u.username,
          avatarUrl: u.displayAvatarURL({ extension: 'png', size: isFirstPage && idx < 3 ? 256 : 128 }),
          durationMinutes: u.studyMinutes,
          rank: { id: u.tierId, name: u.tierName }
        }))
      }
    };

    // 5. Call image-service
    const response = await fetch('http://127.0.0.1:9100/api/v1/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Render failed: ${response.status} ${await response.text()}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), totalPages };
  }

  // 6. Build interactive buttons
  function buildButtons(page: number, maxPages: number) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('lb_prev')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId('lb_page_num')
        .setLabel(`Page ${page} / ${maxPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('lb_next')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= maxPages)
    );
  }

  // 7. Initial render & send
  const { buffer } = await renderPage(currentPage);
  const attachment = new AttachmentBuilder(buffer, { name: `leaderboard-p${currentPage}.png` });

  const message = await interaction.editReply({
    files: [attachment],
    components: totalPages > 1 ? [buildButtons(currentPage, totalPages)] : []
  });

  if (totalPages <= 1) return;

  // 8. Collector for button pagination
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000 // 2 minutes active
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Only the command user can switch pages.', ephemeral: true });
    }

    await i.deferUpdate();

    if (i.customId === 'lb_prev' && currentPage > 1) {
      currentPage--;
    } else if (i.customId === 'lb_next' && currentPage < totalPages) {
      currentPage++;
    }

    const nextRender = await renderPage(currentPage);
    const nextAttachment = new AttachmentBuilder(nextRender.buffer, { name: `leaderboard-p${currentPage}.png` });

    await i.editReply({
      files: [nextAttachment],
      components: [buildButtons(currentPage, totalPages)]
    });
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] }).catch(() => null);
  });
}
```
