Now we've created our database resources, it's time to hook them up to `/api/chat`. We're gonna focus only on the 'adding' parts of this - we'll handle fetching and displaying the chats in the next couple of sections.

### Changing `/api/chat`

The first step for this is understanding what parameters our API chat endpoint receives. It currently receives a list of messages:

```ts
import type { Message } from "ai";

const { messages }: { messages: Message[] } =
  await request.json();
```

We're going to need to add a `chatId` parameter to the endpoint. This will help us identify which chat these messages belong to.

The `chatId` parameter will be optional. If it's not provided, we'll create a new chat. If it is provided, we'll add the messages to the existing chat.

```ts
const {
  messages,
  chatId,
}: { messages: Message[]; chatId?: string } =
  await request.json();
```

### Understanding `onFinish`

One complicated part of this is that we are streaming in the messages from the AI. This means that we need to wait for the stream to complete before we save the AI's message to the chat.

The `onFinish` callback is the place to do this. It's called when the stream completes.

```ts
onFinish({ text, finishReason, usage, response }) {
  const responseMessages = response.messages; // messages that were generated
}
```

### Understanding `appendResponseMessages`

However, there is an extra step we need to perform before we can load the messages into our database.

We need to append the messages we get from `onFinish` to the existing messages provided by the request body. The AI SDK provides a utility function to do this: `appendResponseMessages`.

The reason we need to do this is quite complex. To quote from the docs, `appendResponseMessages` "reuses the existing IDs from the response messages, generates new timestamps, and merges tool-call results with the previous assistant message (if any). This is useful for maintaining a unified message history when working with AI responses in a client-side chat application."

If you don't use `appendResponseMessages`, you sometimes end up with a broken state where tool results are not matched with their tool calls. So it's best practice to merge the existing messages with the new ones before you put them into the database.

I've added a summary of the `appendResponseMessages` function below for reference.

<AISummary title="Understanding `appendResponseMessages`" href="https://sdk.vercel.ai/docs/reference/ai-sdk-ui/append-response-messages">

The `appendResponseMessages` function is a utility that helps manage message history in AI chat applications. It handles the merging of new AI responses with existing messages, particularly focusing on tool call results.

### Basic Usage

It accepts an object with two properties:

- `messages`: An array of messages
- `responseMessages`: An array of response messages

```ts
import { appendResponseMessages } from "ai";

// Example usage
const updatedMessages = appendResponseMessages({
  messages, // Message[]
  responseMessages, // ResponseMessage[], for instance from onFinish
});
```

### Key Features

- **Preserves Message IDs**: Reuses existing IDs from response messages
- **Preserves `parts`**: The `parts` property is correctly calculated, ready to be saved to the database
- **Timestamp Management**: Automatically generates new timestamps
- **Tool Call Integration**: Merges tool-call results with previous assistant messages
- **Message History Management**: Maintains a unified message history

### Important Notes

- Tool call results (messages with `role: "tool"`) are automatically merged with the preceding assistant message
- The function maintains message order and relationships
- It's particularly useful in the context of the `useChat` hook from the Vercel AI SDK

</AISummary>

### Protecting Against Broken Streams

One thing we need to be wary of is that we should create the chat as soon as we receive the first user message, and before we start the stream.

The stream may end up taking a long time, it may be cancelled, or we may be get a timeout error from the service itself.

So we need to create a chat as soon as we receive the user's message, and then update it during `onFinish`.

## Steps to Complete

- Allow the `/api/chat` route to handle a `chatId` parameter
- If the `chatId` is not provided, the route should create a new chat containing the user's message.
- The `chat` should be created in the database before the stream begins, because the stream may take a long time or may be cancelled.
- Once the stream completes (using `onFinish` in `streamText`), the route should save the chat and the messages to the database. If there was no chat initially, it should use the id of the newly created chat.

```ts
import { appendResponseMessages } from "ai";

streamText({
  // ...other properties
  onFinish({ text, finishReason, usage, response }) {
    const responseMessages = response.messages; // messages that were generated

    const updatedMessages = appendResponseMessages({
      messages, // from the POST body
      responseMessages,
    });

    // save the updated messages to the database,
    // by saving over the ENTIRE chat, deleting all
    // the old messages and replacing them with the
    // new ones
  },
});
```

- Remember that when persisting the message in the database, we only need to save the `parts` property of the `updatedMessages` array - the `content` property is not required.

## Not required yet

- Don't worry about fetching the chat messages and displaying them in the frontend. We'll do that in a bit.
- Don't worry about handling the URL parameter for the ID just yet. We'll do that in the next section.
