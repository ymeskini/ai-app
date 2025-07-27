In this exercise, we're gonna be experimenting with a really nice little feature of the AI SDK.

We're inside the answer question function here and I've just pulled out this little property that we're passing in called `experimental_transform`:

```ts
import { streamText } from "ai";

const stream = streamText({
  experimental_transform: [], // <- This is the important bit
});
```

This lets you perform transformations on the stream as it's being streamed down. This can be really useful for just smoothing out the stream a little bit, making it a bit more visually pleasing, as well as improving how markdown is streamed down.

## Improving Markdown Streaming

Since Markdown is streamed token-by-token, it can be pretty janky when it comes to bolded text and code blocks. A sequence of tokens like:

```
**Markdown**
```

Will be streamed as:

```
**
Markdown
**
```

This means that the user will see:

- \*\*
- \*\*Markdown
- **Markdown**

Which is not what we want.

The same is true for code blocks:

- `
- `code
- `code`

And even worse for links:

- [
- [Google
- [Google]
- [Google](
- [Google](https://www.google.com
- [Google](https://www.google.com)

I've even vibe coded an [interactive demo](https://markdown-streaming-playground.vercel.app/) to show you what I mean.

## Markdown Streaming Transform

The developers of the AI SDK actually came back to me with an answer and some really nice example code that we can use to fix this.

First, we can create this `MarkdownJoiner` class, with a `markdownJoinerTransform` function that we can pass to the `experimental_transform` property.

```ts
import type { TextStreamPart, ToolSet } from "ai";

class MarkdownJoiner {
  private buffer = "";
  private isBuffering = false;

  processText(text: string): string {
    let output = "";

    for (const char of text) {
      if (!this.isBuffering) {
        // Check if we should start buffering
        if (char === "[" || char === "*") {
          this.buffer = char;
          this.isBuffering = true;
        } else {
          // Pass through character directly
          output += char;
        }
      } else {
        this.buffer += char;

        // Check for complete markdown elements or false positives
        if (
          this.isCompleteLink() ||
          this.isCompleteBold()
        ) {
          // Complete markdown element - flush buffer as is
          output += this.buffer;
          this.clearBuffer();
        } else if (this.isFalsePositive(char)) {
          // False positive - flush buffer as raw text
          output += this.buffer;
          this.clearBuffer();
        }
      }
    }

    return output;
  }

  private isCompleteLink(): boolean {
    // Match [text](url) pattern
    const linkPattern = /^\[.*?\]\(.*?\)$/;
    return linkPattern.test(this.buffer);
  }

  private isCompleteBold(): boolean {
    // Match **text** pattern
    const boldPattern = /^\*\*.*?\*\*$/;
    return boldPattern.test(this.buffer);
  }

  private isFalsePositive(char: string): boolean {
    // For links: if we see [ followed by something other than valid link syntax
    if (this.buffer.startsWith("[")) {
      // If we hit a newline or another [ without completing the link, it's false positive
      return (
        char === "\n" ||
        (char === "[" && this.buffer.length > 1)
      );
    }

    // For bold: if we see * or ** followed by whitespace or newline
    if (this.buffer.startsWith("*")) {
      // Single * followed by whitespace is likely a list item
      if (
        this.buffer.length === 1 &&
        /\s/.test(char)
      ) {
        return true;
      }
      // If we hit newline without completing bold, it's false positive
      return char === "\n";
    }

    return false;
  }

  private clearBuffer(): void {
    this.buffer = "";
    this.isBuffering = false;
  }

  flush(): string {
    const remaining = this.buffer;
    this.clearBuffer();
    return remaining;
  }
}

export const markdownJoinerTransform =
  <TOOLS extends ToolSet>() =>
  () => {
    const joiner = new MarkdownJoiner();

    return new TransformStream<
      TextStreamPart<TOOLS>,
      TextStreamPart<TOOLS>
    >({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          const processedText = joiner.processText(
            chunk.textDelta,
          );
          if (processedText) {
            controller.enqueue({
              ...chunk,
              textDelta: processedText,
            });
          }
        } else {
          controller.enqueue(chunk);
        }
      },
      flush(controller) {
        const remaining = joiner.flush();
        if (remaining) {
          controller.enqueue({
            type: "text-delta",
            textDelta: remaining,
          } as TextStreamPart<TOOLS>);
        }
      },
    });
  };
```

This can be used like so:

```ts
import { streamText } from "ai";

const stream = streamText({
  experimental_transform: [markdownJoinerTransform],
});
```

## Smoothing Out The Stream

We can also use a transform that the AI SDK exports itself to smooth out the stream a little. It's called `smoothStream`:

```ts
import { smoothStream, streamText } from "ai";

const stream = streamText({
  experimental_transform: [
    smoothStream({
      delayInMs: 20,
      chunking: "line",
    }),
  ],
});
```

Smooth stream improves the user experience by joining chunks that are too small together. It can either be configured to join chunks by line or by word.

By line means you get individual lines streamed down - very useful for code blocks.

By word means you get individual words streamed down.

Since I'm using Google and the responses are very quick, I actually like chunking by line. But you should feel free to mess about with the options here.

`delayInMs` also gives you a bit of control over the delay between chunks. You can use this to artificially slow down the stream, which may end up being a more pleasant experience for the user.

## Steps To Complete

- Look for the existing answer question function.
- Add the code for `markdownJoinerTransform` somewhere in the codebase.
- Add the `markdownJoinerTransform` and `smoothStream` to the `experimental_transform` property of the `streamText` function in the answer question function.
- Run the application to see if it's improved.
