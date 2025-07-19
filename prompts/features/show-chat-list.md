Now we've set up the relatively complex process of creating new chats, we need to fetch the chats from the database to display in the sidebar.

We also need to fetch the chat when the user navigates to the page with a `/?id=...` search param.

## Steps to Complete

- Use the `getChats` helper function to fetch the chats from the database to display in the sidebar. Remember that any helper function needs to be called within a server component, not a client component.

- If there is an `/?id=...` search param, use the `getChat` helper function to fetch the chat from the database to display in the `ChatPage` component. Pass the messages to `initialMessages` in `useChat`.

- If there is no `/?id=...` search param, do not fetch a chat.

- You may need to do some mapping to convert the messages persisted in the DB into an acceptable shape for the `Message` type. Here's how to do it:

```ts
dbMessages?.map((msg) => ({
  id: msg.id,
  // msg.role is typed as string, so we
  // need to cast it to the correct type
  role: msg.role as "user" | "assistant",
  // msg.parts is typed as unknown[], so we
  // need to cast it to the correct type
  parts: msg.parts as Message["parts"],
  // content is not persisted, so we can
  // safely pass an empty string, because
  // parts are always present, and the AI SDK
  // will use the parts to construct the content
  content: "",
}));
```
