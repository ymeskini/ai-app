import { cacheWithRedis } from "~/server/redis/redis";

// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds

export interface JinaCrawlSuccessResponse {
  success: true;
  data: string;
  title?: string;
  description?: string;
  images?: Record<string, string>;
  links?: Record<string, string>;
}

export interface JinaCrawlErrorResponse {
  success: false;
  error: string;
}

export type JinaCrawlResponse =
  | JinaCrawlSuccessResponse
  | JinaCrawlErrorResponse;

export interface JinaBulkCrawlSuccessResponse {
  success: true;
  results: {
    url: string;
    result: JinaCrawlSuccessResponse;
  }[];
}

export interface JinaBulkCrawlFailureResponse {
  success: false;
  results: {
    url: string;
    result: JinaCrawlResponse;
  }[];
  error: string;
}

export type JinaBulkCrawlResponse =
  | JinaBulkCrawlSuccessResponse
  | JinaBulkCrawlFailureResponse;

export interface JinaCrawlOptions {
  maxRetries?: number;
  includeImages?: boolean;
  includeLinks?: boolean;
  removeSelectors?: string[];
  targetSelectors?: string[];
  timeout?: number;
  engine?: "browser" | "direct" | "cf-browser-rendering";
  returnFormat?: "markdown" | "html" | "text";
}

export interface JinaBulkCrawlOptions extends JinaCrawlOptions {
  urls: string[];
}

interface JinaReaderResponse {
  code: number;
  status: number;
  data: {
    title: string;
    description: string;
    url: string;
    content: string;
    images?: Record<string, string>;
    links?: Record<string, string>;
    usage: {
      tokens: number;
    };
  };
}

const callJinaReaderAPI = async (
  url: string,
  options: JinaCrawlOptions = {}
): Promise<JinaCrawlResponse> => {
  const apiKey = process.env.JINA_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "JINA_API_KEY environment variable is not set. Get your API key from https://jina.ai/?sui=apikey",
    };
  }

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  // Add optional headers based on options
  if (options.engine) {
    headers["X-Engine"] = options.engine;
  }

  if (options.timeout) {
    headers["X-Timeout"] = options.timeout.toString();
  }

  if (options.removeSelectors && options.removeSelectors.length > 0) {
    headers["X-Remove-Selector"] = options.removeSelectors.join(",");
  }

  if (options.targetSelectors && options.targetSelectors.length > 0) {
    headers["X-Target-Selector"] = options.targetSelectors.join(",");
  }

  if (options.includeImages) {
    headers["X-With-Images-Summary"] = "true";
  }

  if (options.includeLinks) {
    headers["X-With-Links-Summary"] = "true";
  }

  if (options.returnFormat) {
    headers["X-Return-Format"] = options.returnFormat;
  }

  try {
    const response = await fetch("https://r.jina.ai/", {
      method: "POST",
      headers,
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Jina Reader API request failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as JinaReaderResponse;

    if (data.code !== 200) {
      return {
        success: false,
        error: `Jina Reader API error: Status ${data.status}`,
      };
    }

    return {
      success: true,
      data: data.data.content,
      title: data.data.title,
      description: data.data.description,
      images: data.data.images,
      links: data.data.links,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const jinaBulkCrawlWebsites = cacheWithRedis(
  "jinaBulkCrawlWebsites",
  async (
    options: JinaBulkCrawlOptions,
  ): Promise<JinaBulkCrawlResponse> => {
    const { urls, maxRetries = DEFAULT_MAX_RETRIES, ...crawlOptions } = options;

    const results = await Promise.all(
      urls.map(async (url) => ({
        url,
        result: await jinaCrawlWebsite({ url, maxRetries, ...crawlOptions }),
      })),
    );

    const allSuccessful = results.every(
      (r) => r.result.success,
    );

    if (!allSuccessful) {
      const errors = results
        .filter((r) => !r.result.success)
        .map(
          (r) =>
            `${r.url}: ${(r.result as JinaCrawlErrorResponse).error}`,
        )
        .join("\n");

      return {
        results,
        success: false,
        error: `Failed to crawl some websites:\n${errors}`,
      };
    }

    return {
      results,
      success: true,
    } as JinaBulkCrawlResponse;
  },
);

export const jinaCrawlWebsite = cacheWithRedis(
  "jinaCrawlWebsite",
  async (
    options: JinaCrawlOptions & { url: string },
  ): Promise<JinaCrawlResponse> => {
    const { url, maxRetries = DEFAULT_MAX_RETRIES, ...crawlOptions } = options;

    let attempts = 0;

    while (attempts < maxRetries) {
      const result = await callJinaReaderAPI(url, crawlOptions);

      if (result.success) {
        return result;
      }

      attempts++;
      if (attempts === maxRetries) {
        return result;
      }

      // Exponential backoff: 0.5s, 1s, 2s, 4s, 8s max
      const delay = Math.min(
        MIN_DELAY_MS * Math.pow(2, attempts),
        MAX_DELAY_MS,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return {
      success: false,
      error: "Maximum retry attempts reached",
    };
  },
);

// Helper function to crawl a single URL with default options
export const jinaReadUrl = async (
  url: string,
  options: JinaCrawlOptions = {}
): Promise<JinaCrawlResponse> => {
  return jinaCrawlWebsite({ url, ...options });
};

// Helper function for quick content extraction
export const jinaExtractContent = async (
  url: string
): Promise<string | null> => {
  const result = await jinaReadUrl(url, {
    returnFormat: "markdown",
    removeSelectors: ["nav", "header", "footer", "script", "style"],
  });

  return result.success ? result.data : null;
};
