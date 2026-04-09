import promptfoo from "promptfoo";
import type { ApiProvider, ProviderResponse } from "promptfoo";

import { performSemanticSearch } from "../scripts/semantic-search.ts";

export default class RetrievalProvider implements ApiProvider {
  id(): string {
    return "retrieval-provider";
  }

  async callApi(prompt: string): Promise<ProviderResponse> {
    const cache = promptfoo.cache.getCache();
    const cachedResult = await cache.get<ProviderResponse>(prompt);

    if (cachedResult) return cachedResult;

    const results = await performSemanticSearch(prompt);
    const formattedResult = {
      output: results,
    };
    await cache.set(prompt, formattedResult, 3600); // TTL in seconds

    return formattedResult;
  }
}
