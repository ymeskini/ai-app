import { env } from "~/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

export const streamPublisher = new Redis(env.REDIS_URL);
export const streamSubscriber = new Redis(env.REDIS_URL);

const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

export const cacheWithRedis = <TFunc extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  return (async (...args: Parameters<TFunc>) => {
    const key = `${keyPrefix}${CACHE_KEY_SEPARATOR}${JSON.stringify(args)}`;
    const cachedResult = await redis.get(key);
    if (cachedResult) {
      console.log(`Cache hit for ${key}`);
      return JSON.parse(cachedResult);
    }

    const result = await fn(...args);
    await redis.set(key, JSON.stringify(result), "EX", CACHE_EXPIRY_SECONDS);
    return result;
  }) as TFunc;
};

export const setStreamId = async ({
  chatId,
  streamId,
}: {
  chatId: string;
  streamId: string;
}): Promise<void> => {
  const key = `chat_streams:${chatId}`;

  await redis.set(key, streamId, "EX", CACHE_EXPIRY_SECONDS);
};

export const getStreamId = async (chatId: string): Promise<string> => {
  const key = `chat_streams:${chatId}`;
  const streamId = await redis.get(key);
  return streamId ?? "";
};
