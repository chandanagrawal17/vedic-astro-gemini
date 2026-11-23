import { NextRequest, NextResponse } from "next/server";

interface BucketEntry {
  timestamps: number[];
}

declare global {
  // eslint-disable-next-line no-var
  var __pbRateLimitBuckets: Map<string, BucketEntry> | undefined;
}

function getBuckets(): Map<string, BucketEntry> {
  if (!globalThis.__pbRateLimitBuckets) {
    globalThis.__pbRateLimitBuckets = new Map<string, BucketEntry>();
  }
  return globalThis.__pbRateLimitBuckets;
}

export function resetRateLimiter(): void {
  getBuckets().clear();
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const buckets = getBuckets();
  const windowStart = now - windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };
  const recent = entry.timestamps.filter((ts) => ts > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, { timestamps: recent });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      limit,
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });

  if (buckets.size > 2000) {
    for (const [k, v] of buckets.entries()) {
      if (v.timestamps.every((ts) => ts <= windowStart)) {
        buckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - recent.length),
    retryAfterSeconds: 0,
    limit,
  };
}

export function enforceRateLimit(
  req: NextRequest,
  options: {
    namespace: string;
    limit: number;
    windowMs: number;
  }
): NextResponse | null {
  const ip = getClientIp(req);
  const key = `${options.namespace}:${ip}`;
  const result = checkRateLimit(key, options.limit, options.windowMs);

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${result.retryAfterSeconds}s and try again.`,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}
