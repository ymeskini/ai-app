Our evals are exposing a potential weakness in our system. Our system has no global limit to how often it calls LLMs.

In fact, our only limit is being decided by the API that we're calling. If we hit a rate limit error, then our users have to suffer the consequences.

## The Basics

Most rate limits use some kind of window. Let's model that in a TypeScript type so we can use it to build our function:

```ts
interface RateLimitConfig {
  // Maximum number of requests
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
}
```

For instance, if we want to only allow 100 requests per minute, our config would look like this:

```ts
const config: RateLimitConfig = {
  maxRequests: 100, // 100 requests...
  windowMs: 60_000, // ...per 60,000 milliseconds (1 minute)
};
```

At the end of the window, the requests reset and we can start again.

## Rate Limiting Across Multiple Processes

Understanding how to do this demands a little bit of knowledge about how our application will be deployed.

It's quite tempting to track all of the requests being made to the application in-memory, by using a `Map` to track the number of requests made to the LLM, and reset it when the window closes.

However, this would be a problem. We're using Next.js, it's highly likely that our application will be deployed on a serverless platform. This means that as our application receives API requests and users visit the site, multiple different Node.js processes will be spun up to handle the requests.

That means that we won't be able to sync the rate limit across multiple processes.

## Redis To The Rescue

Redis is a great solution for this. We have a single Redis instance for our entire application, and we can use it to store the number of requests made to the LLM, and reset it when the window closes.

The code below is a good start. We create a `checkRateLimit` function that takes an identifier and a config, and returns a boolean indicating whether the request is allowed.

```ts
import { redis } from "./redis/redis";

export const checkRateLimit = async ({
  maxRequests,
  windowMs,
  keyPrefix = "rate_limit",
}: RateLimitConfig) => {
  // 1. Calculate the window start
  const now = Date.now();
  const windowStart =
    Math.floor(now / windowMs) * windowMs;

  // 2. Create a unique key for storing in Redis
  const key = `${keyPrefix}:${windowStart}`;

  // 3. Use a pipeline to increment the count and set the expiration
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, Math.ceil(windowMs / 1000));

  // 4. Execute the pipeline
  const results = await pipeline.exec();

  // 5. Parse the results
  const currentCount = results[0]?.[1] as number;

  // 6. Return the result
  return {
    allowed: currentCount <= maxRequests,
  };
};
```

The Redis pipeline is extremely cool. It uses the `INCR` Redis command to increment the count for the current window, and the `EXPIRE` command to expire the key after the window has closed.

This is an extremely efficient way to model our rate limit.

## The Full Function

I've built out a full function for you below. It features:

- A clear separation between checking and recording rate limits
- The `recordRateLimit` function handles incrementing counters in Redis and setting expiration times
- The `checkRateLimit` function provides a non-destructive way to check current limits
- Both functions use Redis pipelines for atomic operations
- Comprehensive error handling with proper error propagation
- A retry mechanism that waits for the rate limit window to reset
- Detailed metadata about the current rate limit state

```ts
import { setTimeout } from "node:timers/promises";
import { redis } from "./redis";

export interface RateLimitConfig {
  // Maximum number of requests
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  keyPrefix?: string;
  // Maximum number of retries before failing
  maxRetries?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  // Unix timestamp when the window resets
  resetTime: number;
  // Current number of requests in window
  totalHits: number;
  // Wait for the rate limit to reset,
  // passing a maximum number of retries
  // to avoid infinite recursion
  retry: () => Promise<boolean>;
}

/**
 * Records a new request in the rate limit window
 */
export async function recordRateLimit({
  windowMs,
  keyPrefix = "rate_limit",
}: Pick<
  RateLimitConfig,
  "windowMs" | "keyPrefix"
>): Promise<void> {
  const now = Date.now();
  const windowStart =
    Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error(
        "Redis pipeline execution failed",
      );
    }
  } catch (error) {
    console.error(
      "Rate limit recording failed:",
      error,
    );
    throw error;
  }
}

/**
 * Checks if a request is allowed under the current rate limit
 * without incrementing the counter
 */
export async function checkRateLimit({
  maxRequests,
  windowMs,
  keyPrefix = "rate_limit",
  maxRetries = 3,
}: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart =
    Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${windowStart}`;

  try {
    const currentCount = await redis.get(key);
    const count = currentCount
      ? parseInt(currentCount, 10)
      : 0;

    const allowed = count < maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = windowStart + windowMs;

    let retryCount = 0;

    const retry = async (): Promise<boolean> => {
      if (!allowed) {
        const waitTime = resetTime - Date.now();
        if (waitTime > 0) {
          await setTimeout(waitTime);
        }

        // Check rate limit again after waiting
        const retryResult = await checkRateLimit({
          maxRequests,
          windowMs,
          keyPrefix,
          maxRetries,
        });

        if (!retryResult.allowed) {
          if (retryCount >= maxRetries) {
            return false;
          }
          retryCount++;
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
    // Fail open
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: windowStart + windowMs,
      totalHits: 0,
      retry: async () => {},
    };
  }
}
```

## Using Our Function

The plan will be to use this function in our `/api/chat` route to check the rate limit before calling the LLM.

For testing, we can set the `maxRequests` to 1, and the `windowMs` to 20 seconds.

```ts
const config: RateLimitConfig = {
  maxRequests: 1,
  maxRetries: 3,
  windowMs: 20_000,
  keyPrefix: "global",
};

// Check the rate limit
const rateLimitCheck = await checkRateLimit(config);

if (!rateLimitCheck.allowed) {
  console.log("Rate limit exceeded, waiting...");
  const isAllowed = await rateLimitCheck.retry();
  // If the rate limit is still exceeded, return a 429
  if (!isAllowed) {
    return new Response("Rate limit exceeded", {
      status: 429,
    });
  }

  // Record the request
  await recordRateLimit(config);
}
```

This will wait for 5 seconds before the next request is allowed.

## Steps To Complete

- Look for the existing redis file.
- Implement the `checkRateLimit` function in its own file
- Use it in the `/api/chat` route to check the rate limit before calling the LLM. Instead of returning a `429`, wait for the rate limit to reset.
- Test it by setting the `maxRequests` to 1, and the `windowMs` to 5 seconds
- Run the application and test it by making multiple requests to the `/api/chat` route
- The application should wait for 5 seconds before the next request is allowed
