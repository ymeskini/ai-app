One annoying thing you might have noticed about our UI is that we don't automatically scroll to the bottom of the chat when new messages stream in.

This is a surprisingly difficult problem. And fortunately, there is a nice little library to help.

It's called [`use-stick-to-bottom`](https://github.com/stackblitz-labs/use-stick-to-bottom).

It uses a `StickToBottom` component to handle the sticky behaviour of the scroll:

```tsx
import { StickToBottom } from "use-stick-to-bottom";

function ChatPage() {
  return (
    <StickToBottom
      className="h-[50vh] relative"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="flex flex-col gap-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
          />
        ))}
      </StickToBottom.Content>

      {/* This component uses `useStickToBottomContext` to scroll to bottom when the user enters a message */}
      <ChatBox />
    </StickToBottom>
  );
}
```

## Styling The Scrollbar

Our current chat component has a bit of styling on the scrollbar.

Annoyingly, the `use-stick-to-bottom` library doesn't provide any mechanism for passing a class name to the scrollbar.

We can work around this by using a special Tailwind class that allows for styling direct descendants. The direct descendant is a div, so we can use the `[&>div]:my-tailwind-class` class to apply the styles.

## Steps To Complete

- Find the place where we're rendering the chat messages.
- Wrap the entire chat in a `StickToBottom` component.
- Wrap the chat messages in a `StickToBottom.Content` component.
- Run the code locally and see how the results compare.
