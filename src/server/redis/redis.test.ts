import { describe, it, expect } from "vitest";
import { generateCacheKey } from "./redis";

describe("generateCacheKey", () => {
  it("should generate the same cache key for identical inputs", () => {
    const keyPrefix = "test";
    const args = ["arg1", "arg2", 123];

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
  });

  it("should generate different cache keys for different prefixes", () => {
    const args = ["arg1", "arg2"];

    const key1 = generateCacheKey("prefix1", args);
    const key2 = generateCacheKey("prefix2", args);

    expect(key1).not.toBe(key2);
  });

  it("should generate different cache keys for different arguments", () => {
    const keyPrefix = "test";

    const key1 = generateCacheKey(keyPrefix, ["arg1", "arg2"]);
    const key2 = generateCacheKey(keyPrefix, ["arg1", "arg3"]);

    expect(key1).not.toBe(key2);
  });

  it("should handle empty arguments array", () => {
    const keyPrefix = "test";
    const args: unknown[] = [];

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^test:[a-f0-9]{12}$/);
  });

  it("should handle complex nested objects consistently", () => {
    const keyPrefix = "complex";
    const args = [
      { id: 1, data: { nested: "value", array: [1, 2, 3] } },
      "string",
      42,
      null,
      undefined,
    ];

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
  });

  it("should be sensitive to object property order", () => {
    const keyPrefix = "test";

    // JSON.stringify preserves property order as they were defined
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };

    const key1 = generateCacheKey(keyPrefix, [obj1]);
    const key2 = generateCacheKey(keyPrefix, [obj2]);

    // These should be different since JSON.stringify preserves property order
    expect(key1).not.toBe(key2);
  });

  it("should handle different data types consistently", () => {
    const keyPrefix = "types";
    const args = [
      123,
      "string",
      true,
      false,
      null,
      undefined,
      { key: "value" },
      [1, 2, 3],
      new Date("2023-01-01T00:00:00.000Z"),
    ];

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
  });

  it("should generate cache key with correct format", () => {
    const keyPrefix = "test";
    const args = ["arg1"];

    const key = generateCacheKey(keyPrefix, args);

    // Should match format: prefix:12-character-hash
    expect(key).toMatch(/^test:[a-f0-9]{12}$/);
  });

  it("should handle large argument arrays", () => {
    const keyPrefix = "large";
    const args = Array.from({ length: 1000 }, (_, i) => `item${i}`);

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^large:[a-f0-9]{12}$/);
  });

  it("should handle argument arrays with same values in different order", () => {
    const keyPrefix = "order";

    const key1 = generateCacheKey(keyPrefix, ["a", "b", "c"]);
    const key2 = generateCacheKey(keyPrefix, ["c", "b", "a"]);

    expect(key1).not.toBe(key2);
  });

  it("should be deterministic across multiple calls", () => {
    const keyPrefix = "deterministic";
    const args = ["test", 123, { nested: { value: true } }];

    const keys = Array.from({ length: 100 }, () =>
      generateCacheKey(keyPrefix, args),
    );

    // All keys should be identical
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(1);
  });

  it("should handle readonly arrays correctly", () => {
    const keyPrefix = "readonly";
    const args: readonly unknown[] = ["arg1", "arg2"] as const;

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
  });

  it("should produce different keys for structurally similar but different data", () => {
    const keyPrefix = "similar";

    const key1 = generateCacheKey(keyPrefix, [{ id: "1" }]);
    const key2 = generateCacheKey(keyPrefix, [{ id: 1 }]);

    expect(key1).not.toBe(key2);
  });

  it("should handle special characters in arguments", () => {
    const keyPrefix = "special";
    const args = ["with:colon", "with spaces", "with/slash", 'with"quotes'];

    const key1 = generateCacheKey(keyPrefix, args);
    const key2 = generateCacheKey(keyPrefix, args);

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^special:[a-f0-9]{12}$/);
  });
});
