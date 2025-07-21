# Web Scraping with Jina Reader API

This project now includes two web scraping approaches:

1. **Traditional Cheerio-based scraping** (existing)
2. **Jina Reader API-based scraping** (new)

## Jina Reader API Integration

The new Jina-based scraper provides several advantages over traditional web scraping:

### Benefits
- **Better Content Extraction**: Jina's AI-powered reader extracts clean, structured content optimized for LLMs
- **No HTML Parsing Required**: Returns markdown/text directly without needing to parse HTML
- **Respects Robots.txt**: Built-in robots.txt compliance
- **Better JavaScript Support**: Handles dynamic content better than static scraping
- **Rate Limiting Built-in**: Managed infrastructure with proper rate limiting
- **Multi-format Support**: Returns content in markdown, HTML, text, or even screenshots

### Setup

1. Get your free Jina AI API key from [https://jina.ai/?sui=apikey](https://jina.ai/?sui=apikey)
2. Set the environment variable:
   ```bash
   export JINA_API_KEY="your-api-key-here"
   ```

### Usage Examples

#### Simple Content Extraction
```typescript
import { jinaExtractContent } from "~/lib/jina-scraper";

const content = await jinaExtractContent("https://example.com");
console.log(content); // Clean markdown content
```

#### Advanced Crawling with Options
```typescript
import { jinaCrawlWebsite } from "~/lib/jina-scraper";

const result = await jinaCrawlWebsite({
  url: "https://example.com",
  includeImages: true,
  includeLinks: true,
  removeSelectors: ["nav", "footer", ".ads"],
  targetSelectors: ["article", "main"],
  returnFormat: "markdown",
  engine: "browser", // Use browser engine for JS-heavy sites
});

if (result.success) {
  console.log("Content:", result.data);
  console.log("Title:", result.title);
  console.log("Images:", result.images);
  console.log("Links:", result.links);
}
```

#### Bulk Crawling
```typescript
import { jinaBulkCrawlWebsites } from "~/lib/jina-scraper";

const result = await jinaBulkCrawlWebsites({
  urls: ["https://site1.com", "https://site2.com"],
  returnFormat: "markdown",
  includeLinks: true,
});

if (result.success) {
  result.results.forEach(({ url, result }) => {
    if (result.success) {
      console.log(`${url}: ${result.data.substring(0, 100)}...`);
    }
  });
}
```

#### Adaptive Scraping (Fallback Strategy)
```typescript
import { crawlWebsiteAdaptive } from "~/lib/scraper";

// Will use Jina if JINA_API_KEY is set, otherwise falls back to Cheerio
const result = await crawlWebsiteAdaptive({
  url: "https://example.com",
  useJina: true,
  maxRetries: 3,
});
```

### Configuration Options

#### JinaCrawlOptions
- `maxRetries`: Number of retry attempts (default: 3)
- `includeImages`: Extract image URLs and alt text
- `includeLinks`: Extract all links from the page
- `removeSelectors`: CSS selectors to remove (e.g., ads, navigation)
- `targetSelectors`: CSS selectors to focus on specific content
- `timeout`: Maximum wait time in seconds
- `engine`: Parsing engine (`"browser"`, `"direct"`, `"cf-browser-rendering"`)
- `returnFormat`: Output format (`"markdown"`, `"html"`, `"text"`)

### Rate Limits

- Reader API: 200 RPM (requests per minute) for free tier, 2k RPM for premium
- Premium plans available for higher limits

### Migration from Cheerio

To migrate existing code:

```typescript
// Old way
import { crawlWebsite } from "~/lib/scraper";
const result = await crawlWebsite({ url: "https://example.com" });

// New way with Jina
import { jinaCrawlWebsite } from "~/lib/jina-scraper";
const result = await jinaCrawlWebsite({
  url: "https://example.com",
  returnFormat: "markdown"
});

// Or use adaptive approach
import { crawlWebsiteAdaptive } from "~/lib/scraper";
const result = await crawlWebsiteAdaptive({
  url: "https://example.com",
  useJina: true
});
```

The response format is similar, but Jina provides additional metadata like title, description, and extracted images/links.
