# Cash Mod Image Service

> High-throughput, low-latency, modular SVG-to-PNG rasterization microservice for the Cash Mod ecosystem.

---

## 1. Project Overview

Cash Mod Image Service is an in-memory image-rendering microservice built for high-performance Discord bot integrations, user cards, and real-time gaming statistics.

### Key Characteristics

- **Direct In-Memory PNG Output**: Image bytes are transferred directly in HTTP responses (`image/png`). No object storage (e.g., Cloudflare R2), no CDN dependencies, and no disk persistence for rendered assets.
- **Native Rust Rasterization**: Powered by `@resvg/resvg-js` backed by `tiny-skia` with SIMD acceleration.
- **Static Layer Baking**: Pre-renders computationally expensive SVG Gaussian drop shadows (`feDropShadow`) into embedded transparent PNGs, reducing per-image CPU time by over 76%.
- **Zero-Scan Font Registry**: Bypasses operating system font table scanning (`loadSystemFonts: false`), ensuring predictable sub-millisecond font glyph resolution.
- **SSRF-Safe Remote Asset Ingestion**: Decodes and resizes remote user avatars via `sharp` with strict private IP and loopback blocking across all DNS lookups and redirects.
- **Bounded Memory & Concurrency**: Implements an LRU in-memory buffer cache (byte & entry budget) paired with a bounded concurrency queue with queue backpressure.

---

## 2. Architecture & Data Flow

```text
Cash Mod Discord Bot / Authorized Client
                  │
                  │ Authenticated HTTP Request
                  ▼
            Fastify API
                  │
                  ▼
        Request Validation (Zod)
                  │
                  ▼
        Image Module Registry
                  │
                  ▼
       Selected Image Module (e.g. voice-profile, voice-leaderboard)
                  │
                  ▼
       Module-Specific Data Mapping
                  │
                  ▼
        SVG Template Processing
                  │
                  ▼
        Dynamic Asset Injection (Sharp SIMD Cover Resize)
                  │
                  ▼
          Shared SVG Renderer
                  │
                  ▼
        @resvg/resvg-js (Rust / tiny-skia)
                  │
                  ▼
            PNG Buffer
                  │
                  ▼
        HTTP image/png Response (no-store)
                  │
                  ▼
          Calling Application
```

---

## 3. Directory Structure

```text
image-service/
├── src/
│   ├── app.ts                          # Fastify app factory & module registration
│   ├── server.ts                       # Production server entrypoint & graceful shutdown
│   │
│   ├── config/                         # Environment & runtime configuration
│   │   ├── env.ts                      # Zod-validated environment schema
│   │   ├── server.config.ts            # Fastify server & rate-limit settings
│   │   ├── renderer.config.ts          # Resvg & rasterizer settings
│   │   ├── cache.config.ts             # LRU render cache budget settings
│   │   └── security.config.ts          # SSRF & token authentication policies
│   │
│   ├── core/                           # Shared rendering engine infrastructure
│   │   ├── renderer/
│   │   │   ├── svg-renderer.ts         # @resvg/resvg-js rasterizer wrapper
│   │   │   ├── renderer.types.ts       # ImageModule & RenderContext interfaces
│   │   │   ├── renderer.factory.ts     # RenderContext factory
│   │   │   └── renderer.errors.ts      # Rasterization error types
│   │   │
│   │   ├── templates/
│   │   │   ├── template-loader.ts      # Immutable template disk caching
│   │   │   ├── template-registry.ts    # Template registry lookup by module ID
│   │   │   └── template-version.ts     # SHA-256 template hashing
│   │   │
│   │   ├── svg/
│   │   │   ├── svg-data-injector.ts    # Placeholder & comment block replacer
│   │   │   ├── svg-escaping.ts         # XML text & attribute entity escaping
│   │   │   └── svg-validator.ts        # Security validator against scripts & XXE
│   │   │
│   │   ├── images/
│   │   │   ├── image-fetcher.ts        # SSRF-protected remote image fetcher
│   │   │   ├── image-processor.ts      # Sharp image decoder & cover fit resizer
│   │   │   └── image-injector.ts       # Data URI & SVG image element generator
│   │   │
│   │   ├── fonts/
│   │   │   └── font-registry.ts        # Zero-scan font registration
│   │   │
│   │   ├── cache/
│   │   │   ├── render-cache.ts         # Bounded LRU in-memory buffer cache
│   │   │   └── cache-key.ts            # Deterministic SHA-256 cache key generator
│   │   │
│   │   ├── concurrency/
│   │   │   └── render-queue.ts         # Bounded execution queue with backpressure
│   │   │
│   │   └── observability/
│   │       ├── metrics.ts              # Latency percentiles & request volume tracking
│   │       └── performance-tracker.ts  # Stage timer & CPU usage tracker
│   │
│   ├── modules/                        # Self-contained image design modules
│   │   ├── voice-profile/
│   │   │   ├── index.ts                # Module export & template registration
│   │   │   ├── module.ts               # VoiceProfileModule implementation
│   │   │   ├── schema.ts               # Zod validation schema
│   │   │   ├── renderer.ts             # Module render coordination
│   │   │   ├── data-mapper.ts          # SVG dynamic field injection
│   │   │   ├── config.ts               # Module dimensions & default stats
│   │   │   ├── templates/
│   │   │   │   ├── profile.svg         # Production baked-shadow SVG template
│   │   │   │   └── profile-raw.svg     # Original dynamic reference SVG template
│   │   │   ├── assets/
│   │   │   │   └── baked-background.png # Pre-rendered static shadow container
│   │   │   └── tests/
│   │   │       └── voice-profile.test.ts
│   │   │
│   │   ├── voice-leaderboard/
│   │   │   ├── index.ts                # Module export & template registration
│   │   │   ├── module.ts               # VoiceLeaderboardModule implementation
│   │   │   ├── schema.ts               # Zod validation schema
│   │   │   ├── renderer.ts             # Module render coordination
│   │   │   ├── data-mapper.ts          # Podium & table rows injection
│   │   │   ├── config.ts               # Leaderboard dimensions & limits
│   │   │   ├── templates/
│   │   │   │   └── leaderboard.svg     # Vector leaderboard SVG template
│   │   │   ├── assets/
│   │   │   └── tests/
│   │   │       └── voice-leaderboard.test.ts
│   │   │
│   │   └── registry.ts                 # Central ModuleRegistry instance
│   │
│   ├── routes/
│   │   ├── health.routes.ts            # /health, /ready, /metrics
│   │   ├── metadata.routes.ts          # GET /api/v1/modules
│   │   └── render.routes.ts            # POST /api/v1/render/:moduleId
│   │
│   ├── plugins/
│   │   ├── error-handler.ts            # Standard JSON error responses
│   │   └── request-context.ts          # X-Request-ID correlation tracking
│   │
│   └── utils/
│       ├── errors.ts                   # Custom error hierarchy
│       └── buffer-utils.ts             # Buffer cloning, hashing, byte formatting
│
├── scripts/
│   ├── bake-assets.ts                  # Static shadow container pre-rendering
│   ├── benchmark-render.ts             # Multi-stage workload benchmark runner
│   └── compare-images.ts               # Bit-for-bit mathematical comparison (PSNR/MSE)
│
├── tests/
│   ├── unit/                           # Isolated core logic unit tests
│   ├── integration/                    # Full HTTP API test suite
│   ├── security/                       # SSRF, XML injection, & auth security tests
│   └── performance/                    # Visual regression & benchmark tests
│
├── assets/
│   └── fonts/                          # Bundled TTF fonts (if any; fallback when absent)
│
├── Dockerfile                          # Multi-stage production container
├── docker-compose.yml                  # Production compose file
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 4. Quickstart

### Prerequisites

- Node.js `22.x+`
- `pnpm` (`v12+` or `v9+`)

### Installation & Build

```bash
# 1. Install dependencies
pnpm install

# 2. Pre-render static shadow assets (bakes static containers into PNG)
pnpm bake:shadow

# 3. Compile TypeScript and copy template assets to dist/
pnpm build

# 4. Start production server
pnpm start
```

For development with hot-reload:

```bash
pnpm dev
```

---

## 5. API Reference

### Health & Readiness

#### `GET /health`
Liveness check endpoint.

```bash
curl -s http://localhost:3000/health
```

Response (`200 OK`):
```json
{
  "status": "ok",
  "service": "cash-mod-image-service",
  "timestamp": "2026-10-17T10:00:00.000Z",
  "uptimeSeconds": 120
}
```

#### `GET /ready`
Readiness check verifying registered modules, loaded templates, and font registry state.

```bash
curl -s http://localhost:3000/ready
```

Response (`200 OK`):
```json
{
  "status": "ready",
  "modules": ["voice-profile", "voice-leaderboard"],
  "templatesCount": 2,
  "fonts": {
    "count": 0,
    "fontFiles": [],
    "defaultFontFamily": "Poppins",
    "loadSystemFonts": false
  }
}
```

#### `GET /metrics`
Exposes real-time throughput, latency percentiles (P50, P95, P99), queue depth, and memory.

---

### Module Discovery

#### `GET /api/v1/modules`
Returns all registered modules and default dimensions.

```bash
curl -s http://localhost:3000/api/v1/modules
```

Response:
```json
{
  "success": true,
  "modules": [
    {
      "id": "voice-profile",
      "version": "1.0.0",
      "description": "Cash Mod high-performance voice activity and progression profile card",
      "defaultDimensions": { "width": 1200, "height": 835 }
    },
    {
      "id": "voice-leaderboard",
      "version": "1.0.0",
      "description": "Cash Mod voice activity leaderboard with podium and rankings",
      "defaultDimensions": { "width": 1200, "height": 835 }
    }
  ]
}
```

---

### Image Rendering

#### `POST /api/v1/render/:moduleId`

Renders an image from the specified module and returns raw PNG bytes.

**Headers**:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (if `AUTH_ENABLED=true`)
- `X-Service-Token: <token>` (alternative token header)

#### Example 1: Render Voice Profile Card

```bash
curl -X POST http://localhost:3000/api/v1/render/voice-profile \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "username": "Sakha",
      "bio": "Focus. Compete. Improve.",
      "achievements": 24,
      "goals": 12,
      "milestones": 7,
      "leaderboard": {
        "rank": "#1",
        "percentile": "Top 1%"
      },
      "hoursOverview": {
        "monthly": "321h",
        "weekly": "78h",
        "daily": "08h 11m",
        "allTime": "1,937h 50m"
      },
      "nextRank": {
        "currentRank": "Diamond",
        "currentRange": "(155h to 205h)",
        "nextRank": "Ascendant",
        "nextRange": "(205h to 280h)",
        "progressPercent": 71
      },
      "timeBreakdown": {
        "camHours": "1,128h",
        "camPercent": "58%",
        "nonCamHours": "809h 50m",
        "nonCamPercent": "42%",
        "overallHours": "1,937h 50m"
      }
    }
  }' \
  --output voice-profile.png
```

#### Example 2: Render Voice Leaderboard Card

```bash
curl -X POST http://localhost:3000/api/v1/render/voice-leaderboard \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "WEEKLY VOICE CHAMPIONS",
      "subtitle": "Community Voice Hours Ranking",
      "period": "WEEK 42",
      "entries": [
        { "rank": 1, "username": "Sakha", "hours": "54h 12m", "badge": "Champion" },
        { "rank": 2, "username": "Vortex", "hours": "48h 30m", "badge": "Diamond" },
        { "rank": 3, "username": "Nova", "hours": "41h 05m", "badge": "Platinum" },
        { "rank": 4, "username": "Ghost", "hours": "33h 20m" },
        { "rank": 5, "username": "Phoenix", "hours": "29h 15m", "isCurrentUser": true }
      ]
    }
  }' \
  --output voice-leaderboard.png
```

---

## 6. How to Add a New Image Module

To add a new image design (e.g., `text-leaderboard`, `user-badge`, `achievement-card`):

1. **Create the module directory**:
   ```bash
   mkdir -p src/modules/achievement-card/templates src/modules/achievement-card/tests
   ```

2. **Define the input schema (`src/modules/achievement-card/schema.ts`)**:
   ```typescript
   import { z } from 'zod';

   export const AchievementCardInputSchema = z.object({
     title: z.string().min(1).max(50),
     rarity: z.enum(['Common', 'Rare', 'Epic', 'Legendary']),
     unlockedAt: z.string().optional(),
   });
   export type AchievementCardInput = z.infer<typeof AchievementCardInputSchema>;
   ```

3. **Define module configuration (`src/modules/achievement-card/config.ts`)**:
   ```typescript
   export const achievementCardConfig = {
     id: 'achievement-card',
     version: '1.0.0',
     description: 'Player achievement badge display',
     dimensions: { width: 800, height: 600 },
   };
   ```

4. **Implement `ImageModule<TInput>` (`src/modules/achievement-card/module.ts`)**:
   ```typescript
   import type { ImageModule, RenderContext } from '../../core/renderer/renderer.types.js';
   import { SvgRenderer } from '../../core/renderer/svg-renderer.js';
   import { achievementCardConfig } from './config.js';
   import { AchievementCardInputSchema, type AchievementCardInput } from './schema.js';

   export class AchievementCardModule implements ImageModule<AchievementCardInput> {
     public readonly id = achievementCardConfig.id;
     public readonly version = achievementCardConfig.version;
     public readonly defaultDimensions = achievementCardConfig.dimensions;

     public validate(input: unknown): AchievementCardInput {
       return AchievementCardInputSchema.parse(input);
     }

     public async render(input: AchievementCardInput, context: RenderContext): Promise<Buffer> {
       // Replace dynamic placeholders in context.template.content
       const svg = context.template.content.replace('{{TITLE}}', input.title);
       return SvgRenderer.renderToPng({ svgContent: svg, width: this.defaultDimensions.width });
     }
   }
   ```

5. **Register in `src/modules/achievement-card/index.ts` and `src/app.ts`**:
   The module registry handles typed lookup, validation, caching, and raw PNG HTTP dispatch automatically.

---

## 7. Performance Benchmarks & Visual Verification

### Visual Regression & Fidelity Check

Compares the dynamic render against the baked-shadow render across all $1,002,000$ pixels:

```bash
pnpm compare:images
```

Output:
```text
================================================================================
                 RAW DYNAMIC VS BAKED SHADOW COMPARISON
================================================================================
Canvas Dimensions:       1200 x 835
Total Canvas Pixels:     1,002,000
Differing Pixels:        0 (0.0000%)
Max Channel Delta:       2
Mean Squared Error:      0.000002
PSNR:                    104.16 dB (Near-Infinity)
Speedup Factor:          ~4.28x faster (runtime)
================================================================================
```

### 100-Image Workload Benchmark

```bash
pnpm benchmark
```

Results on Apple Silicon (single-threaded Node.js 22):
- **Average Latency**: `21.1 ms / image`
- **Median Latency (P50)**: `20.9 ms`
- **P95 Latency**: `22.8 ms`
- **Throughput**: `~47.6 images / second`
- **Process Memory**: `< 85 MB RSS`

---

## 8. Testing Suite

The repository includes a comprehensive Vitest suite covering unit, integration, security, and performance scenarios:

```bash
pnpm test
```

### Coverage Areas

- **Unit**: Module registry duplicate checks, template versioning, Zod validation, XML escaping, LRU cache eviction, render queue concurrency & backpressure.
- **Integration**: Full HTTP API test suite (`/health`, `/ready`, `/api/v1/modules`, `/api/v1/render/:moduleId`) with sharp PNG header & dimension verification.
- **Security**: SSRF protection testing against loopback, private IPv4/IPv6, link-local, cloud metadata, and disallowed protocols; XML injection mitigation; request size limits; authentication enforcement.
- **Performance**: Mathematical visual regression verifying 0 differing pixels and >100 dB PSNR.

---

## 9. Docker Deployment

### Build & Run with Docker

```bash
# Build the production image
docker build -t cash-mod-image-service .

# Run container
docker run -d -p 3000:3000 --name cash-mod-image-service cash-mod-image-service
```

### Run with Docker Compose

```bash
docker compose up -d
```

### Container Specifications

- Base: `node:22-bookworm-slim`
- User: `node` (non-root)
- Dependencies: `ca-certificates`, `fontconfig`, `curl`
- Healthcheck: polls `http://127.0.0.1:3000/health` every 30s
- No persistent volumes: memory-only rendering lifecycle.
