import { env } from "~/env";
import Redis from "ioredis";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const redis = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

export const cacheWithRedis = <TArgs extends readonly unknown[], TResult>(
  keyPrefix: string,
  fn: (...args: TArgs) => Promise<TResult>,
): ((...args: TArgs) => Promise<TResult>) => {
  return async (...args: TArgs): Promise<TResult> => {
    const key = `${keyPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedResult) as TResult;
    }

    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    return result;
  };
};

const DAILY_REQUEST_LIMIT = 5;
const ADMIN_NAME = "sefyundercover";
const USER_NAME_CACHE_TTL = 60 * 60; // 1 hour

/**
 * Check if a user is an admin based on their name
 */
export const isUserAdmin = (name: string | null): boolean => {
  return name === ADMIN_NAME;
};

/**
 * Get cached user name or fetch from database
 */
const getUserName = async (userId: string): Promise<string | null> => {
  const cacheKey = `user:name:${userId}`;

  // Try to get from cache first
  const cachedName = await redis.get(cacheKey);
  if (cachedName !== null) {
    return cachedName;
  }

  // Not in cache, query database
  const usersResult = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = usersResult[0];

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const userName = user.name;

  // Cache the result (including null values)
  await redis.set(cacheKey, userName, "EX", USER_NAME_CACHE_TTL);

  return userName;
};

/**
 * Get the Redis key for daily request count
 */
const getDailyRequestKey = (userId: string): string => {
  const today = new Date().toISOString().split("T")[0];
  return `rate_limit:daily:${userId}:${today}`;
};

/**
 * Check if user has exceeded daily rate limit
 */
export const checkRateLimit = async (
  userId: string,
): Promise<{
  allowed: boolean;
  remainingRequests: number;
  isAdmin: boolean;
}> => {
  // Get user name from cache or database
  const userName = await getUserName(userId);
  const isAdmin = isUserAdmin(userName);

  // Admins bypass rate limiting
  if (isAdmin) {
    return {
      allowed: true,
      remainingRequests: DAILY_REQUEST_LIMIT,
      isAdmin: true,
    };
  }

  const key = getDailyRequestKey(userId);
  const currentCount = await redis.get(key);
  const requestCount = currentCount ? parseInt(currentCount, 10) : 0;

  const remaining = Math.max(0, DAILY_REQUEST_LIMIT - requestCount);

  return {
    allowed: requestCount < DAILY_REQUEST_LIMIT,
    remainingRequests: remaining,
    isAdmin: false,
  };
};

/**
 * Increment the daily request count for a user
 */
export const incrementRequestCount = async (
  userId: string,
): Promise<number> => {
  const key = getDailyRequestKey(userId);
  const pipeline = redis.pipeline();

  // Increment counter
  pipeline.incr(key);
  // Set expiry to end of day (in seconds)
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const secondsUntilEndOfDay = Math.floor(
    (endOfDay.getTime() - now.getTime()) / 1000,
  );
  pipeline.expire(key, secondsUntilEndOfDay);

  const results = await pipeline.exec();
  return (results?.[0]?.[1] as number) || 1;
};

/**
 * Get current daily request count for a user
 */
export const getCurrentRequestCount = async (
  userId: string,
): Promise<number> => {
  const key = getDailyRequestKey(userId);
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
};
