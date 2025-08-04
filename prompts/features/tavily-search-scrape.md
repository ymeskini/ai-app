Now that we're collapsing search and scrape into a single tool, it's time to reassess our scraper situation.

We're currently searching and scraping in two separate steps. What if we used an API that allowed us to do those in a single pass?

Tavily comes to mind. It handles searching and scraping for you in a single call.

In theory, this might help us reduce latency and retrieve better results, faster.

## Steps To Complete

- Look for where we're validating our existing environment variables.
- Add the `@tavily/core` package via `npm`
- Ensure that the user has added a `TAVILY_API_KEY` environment variable to `.env`, and make sure it's validated in our existing setup.
- Search for the place where we're doing our existing searching and scraping.
- Replace the logic with a call to the Tavily API:

```ts
import { tavily } from "@tavily/core";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});
const response = await tvly.search(
  "Who is Leo Messi?",
  {
    num: 5,
  },
);
```

Here's an example of the shape of `response`:

```json
{
  "query": "Who is Leo Messi?",
  "answer": "Lionel Messi, born in 1987...",
  "images": [],
  "results": [
    {
      "title": "Lionel Messi Facts | Britannica",
      "url": "https://www.britannica.com/facts/Lionel-Messi",
      "content": "Lionel Messi...",
      "score": 0.81025416,
      "raw_content": null
    }
  ],
  "response_time": "1.67"
}
```

- Test the application to ensure that it's working as expected.
