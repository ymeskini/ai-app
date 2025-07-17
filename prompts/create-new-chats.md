Our `/api/chat` endpoint is now set up to handle the creation of new chats and update existing chats. However, we need to handle this in the frontend.

## Updating Existing Chats

The simpler problem is updating existing chats.

In this case we simply need to take the chat ID from the search parameters and pass it to the `useChat` hook, via the `body` property.

```ts
import { useChat } from "@ai-sdk/react";

useChat({
  body: {
    chatId,
  },
});
```

Anything passed to the `body` property will be passed along to the API endpoint along with the `messages` array.

## Creating New Chats

Creating a new chat is a bit more complicated. We need to make a complicated sequence of events work:

1. The frontend sends the first user message, without a chat ID.
2. The `/api/chat` endpoint creates a new chat in the database, and streams the new chat ID back to the frontend.
3. The frontend receives the new chat ID, and redirects to `?id=${chatId}`, while still streaming the response from the AI.

Number 1 is already working for us. So let's focus on numbers 2 and 3.

### Step 2: Using `dataStream.writeData` to send the new chat ID

You may remember that in our API chat route we have a function called `createDataStreamResponse`.

```ts
import { createDataStreamResponse } from "ai";

createDataStreamResponse({
  async execute(dataStream) {
    // Do the streaming inside here
  },
});
```

This gives us access to a `dataStream` variable which we can use to send custom messages to the front end.

We can do this by calling `dataStream.writeData`. If we have just created a new chat, we should send a special object via `dataStream.writeData` to the frontend with the new `chatId`.

```ts
createDataStreamResponse({
  async execute(dataStream) {
    if (newChatId) {
      dataStream.writeData({
        type: "NEW_CHAT_CREATED",
        chatId: newChatId,
      });
    }
  },
});
```

### Step 3: Listening for the `NEW_CHAT_CREATED` event

This means that in the front end we can listen for this event, and then redirect to the new `chatId`.

We can do that via the `data` property of the `useChat` hook. I've added an AI summary below for reference.

<AISummary title="`data` in the `useChat` hook" href="https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat#data">

The `useChat` hook returns an object with a `data` property. The `data` property is an array - each element of which can be written to using the `dataStream.writeData` method.

It can be accessed like so:

```ts
const { data } = useChat();
```

`data` may be undefined, so check for that first.

`data` is an array of objects. The latest item sent from the data stream is the last item in the array.

</AISummary>

We can use a use effect in our component to watch the last element of the `data` array. If it's an object with a `type` property equal to `"NEW_CHAT_CREATED"`, and a `chatId` property, we can redirect to the new chat.

```ts
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const router = useRouter();

useEffect(() => {
  const lastDataItem = data?.[data.length - 1];

  if (
    lastDataItem &&
    lastDataItem.type === "NEW_CHAT_CREATED"
  ) {
    router.push(`?id=${lastDataItem.chatId}`);
  }
}, [data]);
```

## Summary

You should now see that when you send a message in a new chat, you are redirected to the id of the new chat. The conversation should continue as normal.

Use Drizzle Studio to check that the new entries are being created.

## Steps to complete

- In `/api/chat`, if there is no `chatId`, write some data to the `dataStream` to indicate that a new chat has been created.

```ts
createDataStreamResponse({
  async execute(dataStream) {
    if (newChatId) {
      dataStream.writeData({
        type: "NEW_CHAT_CREATED",
        chatId: newChatId,
      });
    }
    // ... reset of code
  },
});
```

- Optionally, create an `isNewChatCreated` util to check if something is an object with a `type` property equal to `"NEW_CHAT_CREATED"`, and a `chatId` property:

```ts
export function isNewChatCreated(
  data: unknown,
): data is {
  type: "NEW_CHAT_CREATED";
  chatId: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_CHAT_CREATED"
  );
}
```

- Grab `data` from the result of the `useChat` hook. If the latest `data` item is a `NEW_CHAT_CREATED` object, redirect to `?id=${data.chatId}` by using `useRouter` from `next/navigation`. For AI: do NOT use `messages` to get the chatId.

- The `chatId` needed for `api/chat` comes from the search params: `?id=...`. But search params can't be accessed from a `use client` component - so you need to grab them from the parent `page.tsx` component and pass them as a prop to the chat page component. Retain the existing props for `ChatPage`, and don't change the way it's declared or exported.

- The search params also need to be accessed as a promise:

```ts
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
}
```

- Pass the `chatId` via the `body` property in `useChat`. That will send it as part of the request body to `api/chat`.

```ts
useChat({
  body: {
    chatId,
  },
});
```
