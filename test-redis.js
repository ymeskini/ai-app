import Redis from "ioredis";

import { env } from "./src/env.js";

const redis = new Redis(env.REDIS_URL);

async function testRedis() {
  try {
    const pong = await redis.ping();
    console.log("Redis ping response:", pong);
    console.log("Redis connection successful!");
  } catch (error) {
    console.error("Redis connection failed:", error);
  } finally {
    await redis.quit();
  }
}

testRedis()
  .then(() => {
    console.log("Test completed.");
  })
  .catch((error) => {
    console.error("Error during test:", error);
  });
