The first step I want to walk through is designing the shape of the context. We'll be passing this context to the `getNextAction` function, so its shape will be important - and will evolve with our implementation.

## The Class

I found it helpful to model this as a class in TypeScript - using a persistent container with methods has been useful.

```ts
export class SystemContext {}
```

We'll need several properties:

- `step`: The current step in the loop
- `queries`: The history of all queries searched
- `urls`: The history of all URLs scraped

Keeping them `private` means we can expose a smaller API to the rest of our codebase, which helps keep the code organized.

And a couple of methods:

- `shouldStop`: Whether the loop should stop
- `reportQueries`: Report the results of a query
- `reportScrapes`: Report the results of a scrape

```ts
type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  shouldStop() {
    return this.step >= 10;
  }

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }
}
```

We can then pass this context to the `getNextAction` function, when we implement it.

## Formatting The Context

At this point we should consider that JSON is not the best way to pass information to a system prompt.

We want to optimize our system prompt to be readable by the LLM, and JSON contains a lot of unnecessary tokens, like `{`, `"`, and `}`.

<Video resourceId="systemcontexttostringmethods-4q4bq1gd.mp4" />

Inside our `SystemContext` class, we should add methods for the `queries` and `scrapes` arrays to turn them into LLM-readable strings.

```ts
const toQueryResult = (
  query: QueryResultSearchResult,
) =>
  [
    `### ${query.date} - ${query.title}`,
    query.url,
    query.snippet,
  ].join("\n\n");

export class SystemContext {
  // ...other properties

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }
}
```

An important point to note here is that inside `getScrapeHistory`, I've wrapped the `scrape.result` in `<scrape_result>` tags.

That's because `scrape.result` could itself be a markdown document, so for the LLM's clarity we've wrapped it in a XML tag.

## Steps To Complete

- Create a new file containing the `SystemContext` class above.
- Don't implement `getNextAction` yet, we'll do that next.
