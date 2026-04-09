import promptfoo from "promptfoo";
import type { ApiProvider, ProviderResponse } from "promptfoo";
import { performRAGQuery } from "../scripts/rag-test.ts";

export default class GenerationWithSourcesProvider implements ApiProvider {
  id(): string {
    return "generation-with-sources-provider";
  }

  async callApi(prompt: string): Promise<ProviderResponse> {
    const cache = await promptfoo.cache.getCache();

    const cachedResult =
      ((await cache.get(prompt)) as ProviderResponse) || undefined;

    if (cachedResult) return cachedResult;

    const results = await performRAGQuery(prompt);
    const formattedResult = {
      output: {
        answer: results.answer,
        context: results.sources.map((source) => source.content).join("\n"),
      },
    };
    await cache.set(prompt, formattedResult, 3600); // TTL in seconds

    return formattedResult;
  }
}
