import dns from 'node:dns/promises';
import { securityConfig } from '../../config/security.config.js';
import { AssetFetchError } from '../../utils/errors.js';

export function isPrivateIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // IPv4 checks
  const ipv4Parts = ip.split('.').map(Number);
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const [b0, b1] = ipv4Parts as [number, number, number, number];

    // 0.0.0.0/8
    if (b0 === 0) return true;
    // 10.0.0.0/8
    if (b0 === 10) return true;
    // 127.0.0.0/8 (loopback)
    if (b0 === 127) return true;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (b0 === 169 && b1 === 254) return true;
    // 172.16.0.0/12
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;
    // 224.0.0.0/4 (multicast)
    if (b0 >= 224) return true;

    return false;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fe90:') || lower.startsWith('fea0:') || lower.startsWith('feb0:')) {
    return true; // link-local fe80::/10
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true; // unique local fc00::/7
  }

  return false;
}

export async function validateSafeUrl(urlStr: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new AssetFetchError(`Invalid URL provided: ${urlStr}`);
  }

  if (!securityConfig.assetLimits.allowedProtocols.includes(parsedUrl.protocol)) {
    throw new AssetFetchError(`Disallowed protocol: ${parsedUrl.protocol}. Only HTTPS/HTTP allowed.`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Check blocked hostnames
  if (securityConfig.ssrf.blockedHostnames.includes(hostname)) {
    throw new AssetFetchError(`SSRF attempt detected: blocked hostname ${hostname}`);
  }

  // If already an IP address
  if (isPrivateIp(hostname)) {
    throw new AssetFetchError(`SSRF attempt detected: private IP address ${hostname}`);
  }

  // Resolve DNS to verify IP
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    for (const record of lookup) {
      if (isPrivateIp(record.address)) {
        throw new AssetFetchError(`SSRF attempt detected: ${hostname} resolves to private IP ${record.address}`);
      }
    }
  } catch (err) {
    if (err instanceof AssetFetchError) throw err;
    throw new AssetFetchError(`DNS lookup failed for hostname ${hostname}: ${(err as Error).message}`);
  }

  return parsedUrl;
}

export async function fetchRemoteImage(url: string, maxRedirects = 3): Promise<Buffer> {
  let currentUrl = url;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validatedUrl = await validateSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), securityConfig.assetLimits.timeoutMs);

    try {
      const response = await fetch(validatedUrl.toString(), {
        signal: controller.signal,
        redirect: 'manual', // handle redirects manually to check SSRF on target
        headers: {
          'User-Agent': 'CashMod-ImageService/1.0',
          Accept: 'image/png,image/jpeg,image/webp,image/gif,image/*',
        },
      });

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new AssetFetchError('Redirect response missing Location header');
        }
        currentUrl = new URL(location, validatedUrl).toString();
        redirectsRemaining--;
        continue;
      }

      if (!response.ok) {
        throw new AssetFetchError(`Failed to fetch image: HTTP ${response.status} ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (contentLength > securityConfig.assetLimits.maxSizeBytes) {
          throw new AssetFetchError(
            `Image size exceeds maximum limit of ${securityConfig.assetLimits.maxSizeBytes} bytes`
          );
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > securityConfig.assetLimits.maxSizeBytes) {
        throw new AssetFetchError(
          `Image size (${arrayBuffer.byteLength} bytes) exceeds limit (${securityConfig.assetLimits.maxSizeBytes} bytes)`
        );
      }

      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof AssetFetchError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new AssetFetchError(`Fetching image timed out after ${securityConfig.assetLimits.timeoutMs}ms`);
      }
      throw new AssetFetchError(`Failed to fetch remote asset: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AssetFetchError('Too many redirects while fetching asset');
}
