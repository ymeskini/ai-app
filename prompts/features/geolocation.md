Another interesting weakness in our system is that it doesn't know some crucial information about the user.

If the user searches for location-based information, our LLM doesn't know where the user is located.

If I were to search for "great restaurants near me", the LLM would have no idea where I am.

This is relatively simple to solve - we need to add the user's location to the system prompt.

## The Setup

We're going to use the `geolocation` function from `@vercel/functions` to get the user's location. This interprets the user's IP address and returns the latitude, longitude, city, and country.

```ts
import { geolocation } from "@vercel/functions";

function getRequestPromptFromHints(requestHints: {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
}) {
  return `About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;
}

export async function POST(request: Request) {
  const { longitude, latitude, city, country } =
    geolocation(request);

  const requestHints = {
    longitude,
    latitude,
    city,
    country,
  };

  const prompt =
    getRequestPromptFromHints(requestHints);

  // ...use `prompt` as needed (e.g., send to an LLM)
  return new Response(prompt);
}
```

## Testing It Locally

Of course, this will only work when your application is deployed on Vercel - it relies on headers that are only available when the app is running on Vercel.

So, we'll mock these locally inside our function:

```ts
if (process.env.NODE_ENV === "development") {
  request.headers.set("x-vercel-ip-country", "UK");
  request.headers.set(
    "x-vercel-ip-country-region",
    "GB",
  );
  request.headers.set("x-vercel-ip-city", "Oxford");
}
```

As long as we do this _before_ we call `geolocation`, we'll be able to get the user's location.

## Steps To Complete

- Find the place where our `/api/chat` endpoint is defined.
- Install the `@vercel/functions` package using `npm`.
- When the system context is created, add the user's location to the context.
- Look at all the system prompts in the codebase. Where necessary, pass down the user's location to that prompt.
- Run the app to see if it works.
