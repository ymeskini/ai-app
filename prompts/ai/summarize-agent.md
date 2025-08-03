Now we have search and scrape working, but there's an issue.

In order to be sensible with our context window limits, we've had to reduce the number of results we fetch from the search engine.

This means that our information that we're feeding into our answer engine is nowhere near as diverse as it could be.

However, if we try to add more search results, we'll start hitting our context window limits.

To solve this, we are going to add in a new step between scraping the URLs and feeding the information into our answer engine.

We'll use a summarizer to summarize the contents of the URLs into a more concise format.

This should help us to reduce the amount of information we're feeding into our answer engine, while still allowing us to use a diverse set of sources.

## Implementation

We'll do this by creating a `summarizeURL` function. This summarize URL function will need:

- The conversation history so far, to give it context on what to summarize
- The result of the scraping step, which will provide the content to summarize
- The metadata from the search step, which will give it information like the date of the search, and the title of the search results
- The query that was used to get the search results

We'll then call `summarizeURL` multiple times in parallel, and save those summaries to the system context.

Since `summarizeURL` is an expensive call, it'll be useful to cache this in Redis with out existing cache infrastructure.

And we should also use our existing telemetry infrastructure to track the calls to `summarizeURL`.

Finally, we should also consider using a specialized LLM for summarization. We'll need a fast one with a large context window - we don't need much in the way of reasoning, and we want to prioritize speed.

## Prompt

For the prompt, we can draw inspiration from Together.ai's summarizer, which uses this prompt:

```
You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.
```

## Steps to complete

- Look for where the search and scrape actions are defined.
- Look for where the answer function is defined.
- Look for where the 'get next action' function is defined.
- Look for where the system context is defined.
- Look for where the redis cache functions are defined.
- Look for where the telemetry is defined.
- Look for where the existing models are declared.
- Add a new model for summarizing - if using Google, use `gemini-2.0-flash-lite`. If not using Google, ask the user which model they'd like to use.
- Implement the `summarizeURL` function, using the AI SDK and `generateText`.
- When the URL's are scraped, call `summarizeURL` for each URL in parallel.
- Update the system context and the answer function to use the summaries instead of the raw URLs.
