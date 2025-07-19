Now that we have some observability hooked up, we can start increasing the complexity of our implementation while still being able to observe it.

The main issue I see is that we are not actually crawling the sites that we are searching for. We are only using the snippets from search results.

We need to add a scraper tool that will allow us to extract the full text of the page.

There are many, many options here. We can use an external service like Firecrawl or Jina. These services help you handle the complexity that can come from crawling. Some sites don't expose their content unless you run the JavaScript on the page.

However, I don't want to tie us to external services too closely. So instead we're going to write our own scraper.

We're going to write a relatively naive scraper. It will:

- Fetch the HTML of a page
- Check the `robots.txt` file to see if we are allowed to crawl the page. If not, return an explanatory message.
- Use `cheerio` to remove certain irrelevant elements from the page, like `script`, `style`, `nav`, `header`, `footer`, etc.
- Use `turndown` to convert the remaining HTML into markdown.
- Return the markdown.

It will also build in some logic to retry the page and use exponential backoff to handle rate limiting. Like we did with the Serper API we'll do some caching with Redis.

Here's the implementation I've picked out. Feel free to pass it to an LLM to attempt to improve it, or use it as a starting point for your own implementation.

```ts
import * as cheerio from "cheerio";
import { setTimeout } from "node:timers/promises";
import robotsParser from "robots-parser";
import TurndownService from "turndown";
import { cacheWithRedis } from "~/server/redis/redis.ts";

export const DEFAULT_MAX_RETRIES = 3;
const MIN_DELAY_MS = 500; // 0.5 seconds
const MAX_DELAY_MS = 8000; // 8 seconds

export interface CrawlSuccessResponse {
  success: true;
  data: string;
}

export interface CrawlErrorResponse {
  success: false;
  error: string;
}

export type CrawlResponse =
  | CrawlSuccessResponse
  | CrawlErrorResponse;

export interface BulkCrawlSuccessResponse {
  success: true;
  results: {
    url: string;
    result: CrawlSuccessResponse;
  }[];
}

export interface BulkCrawlFailureResponse {
  success: false;
  results: {
    url: string;
    result: CrawlResponse;
  }[];
  error: string;
}

export type BulkCrawlResponse =
  | BulkCrawlSuccessResponse
  | BulkCrawlFailureResponse;

export interface CrawlOptions {
  maxRetries?: number;
}

export interface BulkCrawlOptions
  extends CrawlOptions {
  urls: string[];
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});

const extractArticleText = (html: string): string => {
  const $ = cheerio.load(html);
  $(
    "script, style, nav, header, footer, iframe, noscript",
  ).remove();

  const articleSelectors = [
    "article",
    '[role="main"]',
    ".post-content",
    ".article-content",
    "main",
    ".content",
  ];

  let content = "";

  for (const selector of articleSelectors) {
    const element = $(selector);
    if (element.length) {
      content = turndownService.turndown(
        element.html() || "",
      );
      break;
    }
  }

  if (!content) {
    content = turndownService.turndown(
      $("body").html() || "",
    );
  }

  return content.trim();
};

const checkRobotsTxt = async (
  url: string,
): Promise<boolean> => {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const response = await fetch(robotsUrl);

    if (!response.ok) {
      // If no robots.txt exists, assume crawling is allowed
      return true;
    }

    const robotsTxt = await response.text();
    const robots = robotsParser(robotsUrl, robotsTxt);

    // Use a common crawler user agent
    return (
      robots.isAllowed(url, "LinkedInBot") ?? true
    );
  } catch (error) {
    // If there's an error checking robots.txt, assume crawling is allowed
    return true;
  }
};

export const bulkCrawlWebsites = async (
  options: BulkCrawlOptions,
): Promise<BulkCrawlResponse> => {
  const { urls, maxRetries = DEFAULT_MAX_RETRIES } =
    options;

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      result: await crawlWebsite({ url, maxRetries }),
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
          `${r.url}: ${(r.result as CrawlErrorResponse).error}`,
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
  } as BulkCrawlResponse;
};

export const crawlWebsite = cacheWithRedis(
  "crawlWebsite",
  async (
    options: CrawlOptions & { url: string },
  ): Promise<CrawlResponse> => {
    const { url, maxRetries = DEFAULT_MAX_RETRIES } =
      options;

    // Check robots.txt before attempting to crawl
    const isAllowed = await checkRobotsTxt(url);
    if (!isAllowed) {
      return {
        success: false,
        error: `Crawling not allowed by robots.txt for: ${url}`,
      };
    }

    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await fetch(url);

        if (response.ok) {
          const html = await response.text();
          const articleText = extractArticleText(html);
          return {
            success: true,
            data: articleText,
          };
        }

        attempts++;
        if (attempts === maxRetries) {
          return {
            success: false,
            error: `Failed to fetch website after ${maxRetries} attempts: ${response.status} ${response.statusText}`,
          };
        }

        // Exponential backoff: 0.5s, 1s, 2s, 4s, 8s max
        const delay = Math.min(
          MIN_DELAY_MS * Math.pow(2, attempts),
          MAX_DELAY_MS,
        );
        await setTimeout(delay);
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          return {
            success: false,
            error: `Network error after ${maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
        const delay = Math.min(
          MIN_DELAY_MS * Math.pow(2, attempts),
          MAX_DELAY_MS,
        );
        await setTimeout(delay);
      }
    }

    return {
      success: false,
      error: "Maximum retry attempts reached",
    };
  },
);
```

## Steps to complete

- Install the `cheerio`, `turndown` and `robots-parser` packages.

```bash
npm install cheerio turndown robots-parser
```

- Add the crawling logic above somewhere in the code base.

- Find the existing place where we're calling `streamText`. Add a new tool, `scrapePages`, that takes in a list of URLs and returns the full text of the pages, formatted in markdown.

- Inside the `scrapePages` tool, use the `crawlMultipleUrls` function to get the full text of the pages and return it to the LLM. Errors should also be passed to the LLM.

- Cache the usage of the `scrapePages` tool using the existing `cacheWithRedis` function

- Add a section to the system prompt that explains that the `scrapePages` tool is available to use, and when to use it.

- Test the new tool by asking your Deepsearch implementation some questions. Observe the results of the crawling in Langfuse.
