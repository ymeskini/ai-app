We need to show something to the user while our system is working.

Currently all we have is a loading spinner. That's fine, but people expect a bit more from LLM-powered applications these days.

While we're walking through our loop, we should be showing the user what we're up to. We should be giving them some kind of insight as to the steps our system is taking.

This will serve two purposes:

- The latency will feel less painful because the user will have something to observe
- The user will trust the result more because they'll be able to see how our system got there.

## What do we want to show?

I've put together a basic design for what we want to show.

![Progress indications design](https://res.cloudinary.com/total-typescript/image/upload/v1745853940/workshops/lesson-xt078/jnrugfqnpu5uclwtpt2y.png)

We can think of it kind of like a debug trace for the users. Each step that the system takes will be shown as a separate step, with a description of what the system was thinking at the time.

To do that we're going to need to extract a bit more information from our system - our `getNextAction` function needs to give us a `title` for the step, and a `reasoning` for why it chose that step:

```ts
import { z } from "zod";

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z
    .string()
    .describe("The reason you chose this step."),
  // ...existing fields
});
```

## Sending progress information

To do that, we're going to send information back to the user while our system is working.

We've already looked at one mechanism for sending live data back through our stream protocol - `dataStream.writeData`.

```ts
dataStream.writeData({
  type: "NEW_CHAT_CREATED",
  chatId: currentChatId,
});
```

We use this mechanism to communicate to the front end that a new chat had been created and pass it the chat ID.

We could use the same mechanism again. However, there's a problem. Any data sent back via `datastream.writeData` is associated with the whole _chat_, not the individual messages.

Luckily, there's a better way: `dataStream.writeMessageAnnotation`.

```ts
dataStream.writeMessageAnnotation({
  type: "NEW_ACTION",
  action: nextAction,
});
```

This sends back an instruction to annotate the currently streaming message.

The annotation appears on the message as `message.annotations`, not inside `parts`. This means that we can display it inside our `ChatMessage` component.

So the plan here is, after the `getNextAction` function has finished, we'll send back an annotation describing the action that was chosen.

### Strongly typing message annotations

By default, the `message.annotations` field is typed pretty loosely. We want to pass _specific_ information back to the front end.

We can do that by creating our own type, `OurMessageAnnotation`:

```ts
import type { Action } from "./get-next-action";

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};
```

Then, combined with `satisfies`, we can pass this type to the `dataStream.writeMessageAnnotation` function:

```ts
dataStream.writeMessageAnnotation({
  type: "NEW_ACTION",
  action: nextAction,
} satisfies OurMessageAnnotation);
```

## Passing `writeMessageAnnotation` to our loop

Currently, the only place to access `dataStream` (and so, `dataStream.writeMessageAnnotation`) is in the `/api/chat` route.

We need to pass the `writeMessageAnnotation` function into our system.

That means we should extract out the type, and pass it into our system as a parameter.

```ts
import type { OurMessageAnnotation } from "./get-next-action";

export function whateverNameWeHaveGivenOurSystem(opts: {
  writeMessageAnnotation: (
    annotation: OurMessageAnnotation,
  ) => void;
}) {
  // ...existing code
}
```

This will mean, for our evals (where we don't care about showing progress), we can pass in a no-op function.

```ts
whateverNameWeHaveGivenOurSystem({
  writeMessageAnnotation: () => {},
});
```

## Showing the annotations in the UI

We'll need some kind of components that can take the annotations and display them in the UI as we'd like them.

If you're feeling lazy, feel free to copy this component:

```tsx
export const ReasoningSteps = ({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<
    number | null
  >(null);

  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() =>
                  setOpenStep(isOpen ? null : index)
                }
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                {annotation.action.title}
              </button>
              <div
                className={`${isOpen ? "mt-1" : "hidden"}`}
              >
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      <Markdown>
                        {annotation.action.reasoning}
                      </Markdown>
                    </div>
                    {annotation.action.type ===
                      "search" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <SearchIcon className="size-4" />
                        <span>
                          {annotation.action.query}
                        </span>
                      </div>
                    )}
                    {annotation.action.type ===
                      "scrape" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <LinkIcon className="size-4" />
                        <span>
                          {annotation.action.urls
                            ?.map(
                              (url) =>
                                new URL(url).hostname,
                            )
                            ?.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

Otherwise, try vibing one out yourself. If you're not used to building UI, I strongly recommend this loop:

- Try something out
- Screenshot the component, and copy/paste it into Cursor
- Ask it to improve it in specific ways
- Repeat until you're happy

## Steps To Complete

- Look for the `getNextAction`, the `dataStream` variable, and the `ChatMessage` component.
- Extract out the `OurMessageAnnotation` type, and pass `writeMessageAnnotation` into our system.
- Make `getNextAction` also return a `title` and `reasoning` from the LLM.
- Once `getNextAction` has finished, send back an annotation with the action that was chosen.
- Find the `ChatMessage` component and display the annotations in the UI. Only show the reasoning steps if the message is from the AI.
- Check it in the UI to see if it works.
