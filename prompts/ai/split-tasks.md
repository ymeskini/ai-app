In our previous exercise, we discussed the trade-offs between agentic and deterministic approaches. One way to make our system more deterministic is to reduce the number of decisions the LLM needs to make.

Currently, our system has two separate actions that can be chosen by `getNextAction`:

- `search`: Search the web for information, returns a list of URLs and associated snippets
- `scrape`: Crawl a URL for its contents

If we think about it, we pretty much _always_ want to crawl a URL if we're searching for information. Doing so will give us more complete information, and we avoid an extra round trip to the LLM to decide that for us.

By combining these actions, we're making our system more deterministic - the LLM no longer needs to decide whether to crawl a URL or not.

This change also means we need to update our `SystemContext` class, which currently maintains separate histories for queries and scrapes. Right now, we have:

```ts
export class SystemContext {
  private queryHistory: QueryResult[] = [];
  private scrapeHistory: ScrapeResult[] = [];

  getQueryHistory(): string {
    // Returns an LLM-readable string
  }

  getScrapeHistory(): string {
    // Returns an LLM-readable string
  }
}
```

Since we'll always be scraping URLs when we search, it makes sense to combine these histories into a single `searchHistory` that tracks both the search results and their associated scraped content.

Here's what the updated system context will look like:

```ts
type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

export class SystemContext {
  private searchHistory: SearchHistoryEntry[] = [];

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<scrape_result>`,
              result.scrapedContent,
              `</scrape_result>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }
}
```

However, one thing is worth bearing in mind. Our plan will result in a LOT of information being piled into the context window. To mitigate this, we'll attempt to fetch fewer results from the search engine.

## Steps to complete

- Find the file where the search and scrape actions are defined.
- Find the file where we're using the LLM to choose the next action our system should take.
- Find the file where we're maintaining an in-memory history of the search and scrape actions.
- Combine the search and scrape actions into a single action, still called `search`. This action will take in a query, and return a list of URLs, snippets, and the markdown contents of the URLs.
- Update the `actionSchema` to remove the `scrape` action type.
- Update the system prompt in `getNextAction` to use the new action, and remove the references to the previous actions.
- Update the `SystemContext` class to combine `queryHistory` and `scrapeHistory` into a single `searchHistory` that tracks both searches and their associated scraped content. This will require:
  - Creating a new type that combines `QueryResult` and `ScrapeResult`
  - Updating the `reportQueries` and `reportScrapes` methods to work with the new combined type
  - Updating the `getQueryHistory` and `getScrapeHistory` methods to work with the new combined type
- Ensure that the search and scrape functionality is cached in Redis, using the existing redis caching infrastructure.
- Update the default number of results to fetch from the search engine to 3.
- Test it out!
