It's time to start making our app useful. It currently acts as a traditional chatbot: a naive ChatGPT clone.

We're going to make it more useful by adding a search web tool.

There are dozens of search API's available. [Tavily](https://tavily.com/), [Brave](https://brave.com/search/api/), and many others.

But for this course, we're going to use [Serper](https://serper.dev/). It has a generous free tier, requires no credit card to sign up, and is very easy to use.

Sign up to [Serper here](https://serper.dev/signup), and grab an API key.

## Steps to Complete

- Ensure that we have a `SERPER_API_KEY` in the `.env` file.
- Configure the `env.js` file to use the `SERPER_API_KEY`.
- Add a search web tool which can search the web using the searching functions we have declared in the repo.
- The search tools should be declared inline in the `streamText` call:

```ts
tools: {
  searchWeb: {
    parameters: z.object({
      query: z.string().describe("The query to search the web for"),
    }),
    execute: async ({ query }, { abortSignal }) => {
      const results = await searchSerper(
        { q: query, num: 10 },
        abortSignal,
      );

      return results.organic.map((result) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
      }));
    },
  },
}
```

- Modify the system prompt passed to `streamText` to make the LLM aware that it can call the search web tool

```ts
streamText({
  system: ``, // system prompt goes here
});
```

- Modify the system prompt so that it attempts to always use the search web tool
- Modify the system prompt so that it attempts to always cite its sources with inline links
- Add `maxSteps: 10` to the `streamText` so that it behaves like an agent

The exercise is finished when:

- The user can chat to the agent and it will search the web

## Not Required Yet

- The agent does not need to crawl the site specified, they only need to return the snippets
- No persistence is required yet
- Don't need to show the user the search terms
