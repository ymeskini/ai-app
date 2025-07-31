import { setTimeout } from "node:timers/promises";
import { redis } from "./redis";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
  maxRetries?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retry: () => Promise<boolean>;
}

/**
 * Records a new request in the rate limit window
 */
export async function recordRateLimit({
  windowMs,
  keyPrefix = "rate_limit",
}: Pick<RateLimitConfig, "windowMs" | "keyPrefix">): Promise<void> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline execution failed");
    }
  } catch (error) {
    console.error("Rate limit recording failed:", error);
    throw error;
  }
}

/**
 * Checks if a request is allowed under the current rate limit
 * without incrementing the counter
 */
export async function checkGlobalRateLimit({
  maxRequests,
  windowMs,
  keyPrefix = "rate_limit",
  maxRetries = 3,
}: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const currentCount = await redis.get(key);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = windowStart + windowMs;

    let retryCount = 0;

    const retry = async (): Promise<boolean> => {
      if (!allowed) {
        const waitTime = resetTime - Date.now();
        if (waitTime > 0) {
          console.log(
            `Rate limit exceeded. Waiting ${waitTime}ms for window to reset...`,
          );
          await setTimeout(waitTime);
        }

        // Check rate limit again after waiting
        const retryResult = await checkGlobalRateLimit({
          maxRequests,
          windowMs,
          keyPrefix,
          maxRetries,
        });

        if (!retryResult.allowed) {
          if (retryCount >= maxRetries) {
            console.log(
              `Max retries (${maxRetries}) exceeded. Failing request.`,
            );
            return false;
          }
          retryCount++;
          console.log(`Retry attempt ${retryCount}/${maxRetries}`);
          return await retryResult.retry();
        }
        return true;
      }
      return true;
    };

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: count,
      retry,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - if Redis is down, allow the request
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs,
      totalHits: 0,
      retry: async () => true,
    };
  }
}
