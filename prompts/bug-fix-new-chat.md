You may have noticed that our new chat button is not actually working.

This is a surprisingly complicated problem to solve.

It's entirely a frontend problem, and involves a little bit of React knowledge in order to solve it.

So if you're primarily interested in this course for the AI stuff, I recommend skipping this exercise.

## The Problem

Let's walk through the problem first.

The issue is that when we are on a chat where we already have some messages, and we click the new chat button, we're expecting two things to happen:

1. The URL changes to `?chatId=new-chat-id`
2. The chat messages disappear

Number 1 happens fine, but number 2 doesn't.

The reason is that our `useChat` hook is not being re-initialized when the URL changes.

So the messages we have in our application's state are not being cleared.

## The Bad Solution

I tried a couple of solutions for this. First, I tried to use a `key` prop on the `ChatPage` component.

```tsx
<ChatPage key={chatId} />
```

The theory here is that changing the `key` forces the component to re-render, and drop all of its internal state back to its defaults.

However, this has an unfortunate side effect. The current behaviour of our stream acts like this:

1. We call `POST /api/chat` to stream some messages
2. The server creates a chat during the stream
3. The server sends this chat id back to the client
4. The client navigates to the new chat page: `?chatId=new-chat-id`
5. The stream continues

However - if we change the `key` prop on the `ChatPage` component, something nasty will happen. We'll reach step 4, and the stream will stop - because the `useChat` hook will be re-initialized, and the connection to the stream will be lost.

## The Better Solution

But what if we had a _stable_ `chatId` that we could use as the `key` for the component?

Instead of passing `undefined` if there is no `chatId` in the URL, we could pass a stable `chatId` that we generate ourselves.

```tsx
const chatId = chatIdFromUrl ?? crypto.randomUUID();

<ChatPage key={chatId} />;
```

We'd then pass this `chatId` into `useChat` via `body`:

```tsx
useChat({
  body: {
    chatId,
  },
});
```

And use the `chatId` to save the chat to the database.

### Refactoring Our Previous Logic

However, this does change out logic significantly. Before, our application had two 'states':

1. `chatId === undefined` - we're creating a new chat
2. `chatId !== undefined` - we're loading an existing chat

Now that `chatId` is never `undefined`, we need to pass an extra property to our `ChatPage` component to handle the case where `chatId` is `undefined`:

```tsx
const chatId = chatIdFromUrl ?? crypto.randomUUID();

<ChatPage
  chatId={chatId}
  isNewChat={!chatIdFromUrl}
/>;
```

Now, our two states are represented by the `isNewChat` prop:

1. `isNewChat === true` - we're creating a new chat
2. `isNewChat === false` - we're loading an existing chat

We'll need to pass `isNewChat` to our `useChat` hook:

```tsx
useChat({
  body: {
    chatId,
    isNewChat,
  },
});
```

And we'll then need to change the logic inside our `/api/chat` endpoint to handle the case where `isNewChat` is `true`.

## Steps To Complete

- Look at the existing `POST /api/chat` endpoint.
- Change `chatId` to always be a string. Add `isNewChat` to the body.
- Change the logic inside the `POST /api/chat` endpoint to represent our new states, where `isNewChat` is `true` or `false`.

- Look at the `ChatPage` component, and the server component where it's called.
- Inside the server component, pass `isNewChat` to the `ChatPage` component, and default the `chatId` to `crypto.randomUUID()`.
- Use the new `chatId` as a `key` prop for the `ChatPage` component.

- Run the code locally and see if the new chat button works.
