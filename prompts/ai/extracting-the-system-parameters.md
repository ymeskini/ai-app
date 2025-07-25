We are currently hard-coding multiple variables that are very important to our system.

The first one that springs to mind is the number of results we want to return from the search.

We want to be able to change that number easily, possibly even on the fly in production.

There are various ways we could do this:

- Feature flags
- Environment variables
- A/B testing based on user ID

For now, we will use environment variables.

## Environment Variables

We are using `@ts-oss/env-nextjs` to manage environment variables. All the zod properties passed in to the `server` property of `createEnv` are expected to be strings.

```ts
import { z } from "zod";
import { createEnv } from "@ts-oss/env-nextjs";

export const env = createEnv({
  server: {
    SEARCH_RESULTS_COUNT: z.string().default("10"),
  },
});
```

If we want to coerce the string to a number, we can do so by using `z.coerce.number()`.

```ts
import { z } from "zod";
import { createEnv } from "@ts-oss/env-nextjs";

export const env = createEnv({
  server: {
    SEARCH_RESULTS_COUNT: z.coerce
      .number()
      .default(10),
  },
});
```

## Steps to complete:

- Find the tool where we're calling the search API
- Update the code which manages environment variables to require `SEARCH_RESULTS_COUNT`. Default it to 10.
- Update the code to use the environment variable instead of the hard-coded value.
- Test it out yourself to make sure it's working.
