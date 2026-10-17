import { env } from './env.js';

export const securityConfig = {
  authEnabled: env.AUTH_ENABLED ?? (env.NODE_ENV === 'production' && Boolean(env.SERVICE_AUTH_TOKEN)),
  serviceAuthToken: env.SERVICE_AUTH_TOKEN,
  assetLimits: {
    timeoutMs: env.ASSET_FETCH_TIMEOUT_MS,
    maxSizeBytes: env.MAX_ASSET_SIZE_BYTES,
    allowedProtocols: ['https:', 'http:'],
  },
  ssrf: {
    // Prohibited IPv4 ranges:
    // 0.0.0.0/8 (current network)
    // 10.0.0.0/8 (private)
    // 100.64.0.0/10 (carrier-grade NAT)
    // 127.0.0.0/8 (loopback)
    // 169.254.0.0/16 (link-local, cloud metadata)
    // 172.16.0.0/12 (private)
    // 192.0.0.0/24 (IETF protocol assignments)
    // 192.0.2.0/24 (TEST-NET-1)
    // 192.168.0.0/16 (private)
    // 198.18.0.0/15 (benchmarking)
    // 198.51.100.0/24 (TEST-NET-2)
    // 203.0.113.0/24 (TEST-NET-3)
    // 224.0.0.0/4 (multicast)
    // 240.0.0.0/4 (reserved)
    // 255.255.255.255/32 (broadcast)
    blockedHostnames: [
      'localhost',
      'metadata.google.internal',
      '169.254.169.254', // AWS/GCP/Azure instance metadata
      'instance-data',
    ],
  },
};
