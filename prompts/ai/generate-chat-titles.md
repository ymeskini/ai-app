Now we've got our system in a bit of a stable spot after the rewrite, let's take a look at a couple of UX things that have been annoying me.

First of all, the state of our chat titles is pretty depressing. As it stands right now, we are taking the most recent message, slicing the first 50 characters, and adding an ellipsis.

```ts
await upsertChat({
  userId: session.user.id,
  chatId: newChatId,
  title:
    messages[messages.length - 1]!.content.slice(
      0,
      50,
    ) + "...",
  messages: messages, // Only save the user's message initially
});
```

We can do a whole lot better, and most chat apps do. Most chat apps call an LLM with the correct context in order to generate a chat title. We should absolutely do the same.

## The Setup

We don't want to be generating chat titles too often. Probably only when the chat is first created.

Since we're not concerned about streaming the title in, we can use `generateText` instead of `streamText`, from `ai`.

```ts
import { generateText } from "ai";

export const generateChatTitle = async (
  messages: Message[],
) => {
  const { text } = await generateText({
    model,
    system: `You are a chat title generator.
      You will be given a chat history, and you will need to generate a title for the chat.
      The title should be a single sentence that captures the essence of the chat.
      The title should be no more than 50 characters.
      The title should be in the same language as the chat history.
      `,
    prompt: `Here is the chat history:

      ${messages.map((m) => m.content).join("\n")}
    `,
  });

  return text;
};
```

## The Timing

The timing here is important. We want to make sure that the streaming is not held up by generating the chat title. We do want nice chat titles, but more important is that we don't increase our latency.

To me, it makes sense to kick off the generating of the chat title in parallel with the stream, then capture it during `onFinish`.

This means:

- If the chat is new, generate a title and save it in a variable as a `Promise<string>`. If the chat is not new, we can just resolve an empty string.

```ts
let titlePromise: Promise<string> | undefined;

if (someLogicForCheckingIfChatIsNew) {
  titlePromise = generateChatTitle(messages);
} else {
  titlePromise = Promise.resolve("");
}
```

- If we do need to save the chat before the stream starts, we can save the chat with a title of `"Generating..."`.

- Once the stream is finished (via `onFinish`), we can resolve the title promise. We can then upsert the chat with the title if it's not empty.

```ts
const title = await titlePromise;

await upsertChat({
  userId: session.user.id,
  chatId: newChatId,
  messages: messages,
  ...(title ? { title } : {}), // Only save the title if it's not empty
});
```

## Steps To Complete

- Find the code for the `/api/chat` endpoint.
- Find the code for the helper function which updates the chat in the database. Make that function only optionally take a title, instead of it being a required field.
- Add a new function to generate a chat title.
- Update the logic in the `/api/chat` endpoint to match the 'The Timing' section above.
- Run the app to see if it works.
