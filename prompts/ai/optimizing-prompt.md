# Optimizing Our Prompt


At this point, we can gain a lot of value by optimizing the prompt we're passing to the LLM. How we do this will depend on what our goals are.

## Encourage Our Agent To Plan

We want our application to handle complex multi-hop queries. We'll look at robust strategies for this in a later lesson, including task decomposition.

But we can get pretty far simply by asking our agents to devise a plan before they start their work.

### Example Planning Prompt

```markdown
Before you answer the question, you should devise a plan to answer the question. Your plan should be a list of steps.

You should then execute the plan by calling the tools available to you.

If you receive new information which changes your plan, you should update your plan and execute the new plan.
```

This kind of prompting is called **'Thought Generation'** - asking the LLM's to generate thoughts as part of their output. There are many approaches to thought generation, the most famous being chain of thought prompting.

### Types of Chain of Thought Prompting

- **Zero-Shot CoT**: The prompt above is an example of Zero-Shot CoT prompting. 'Zero-Shot' indicates that we're not providing any examples of what kind of reasoning we want the LLM to do.

- **Few-Shot CoT**: By contrast, provides examples of what kind of reasoning we want the LLM to do. This is sometimes called Golden CoT.

### Further Reading

For more information, I strongly recommend checking out the [Prompt Report](https://promptreport.com), an extremely comprehensive overview of the current state of prompt engineering. Section 2.2.2 covers thought generation in depth, and you can get some great insights on how to improve your prompt.

## Improving Information Sources
The quality of our application's responses will depend on the quality of the information it receives.

This is especially true in fields where a lot of speculation takes place, and low-quality information is incentivised. For instance, I'm a huge football fan - and I'm writing during the summer transfer window. Articles about players being signed, or players being sold, are often written based on fantasy or hearsay.

However, I know that two journalists in particular tend to have higher quality access to information: **David Ornstein** and **Fabrizio Romano**.

So in my prompt I can specify that for any information about football transfer news, my agent should use the information from David Ornstein and Fabrizio Romano.

### Example Source Prioritization Prompt

```markdown
For any information about football transfer news, prioritize sources from David Ornstein and Fabrizio Romano. If you can't find the information from them, use other sources.
```

This extra level of detail in your instructions can really take your application to the next level - especially when you want to specialize it for a specific use case.

## Styling The Output
One of the most impactful things we can do with our prompt is change the way that our application's output is formatted.

For example, we want to be very strict about the way that links are displayed. As I've been developing this application, I noticed that there is a huge amount of variance in the way that links are managed.

### Using LLMs to Create Format Instructions

One technique I really like for this is to get another LLM to create the prompt for the formatting instructions.

For instance, I prompted Claude Sonnet 4 with the text below:

```markdown
Give me a system prompt I can pass to an LLM to tell it how markdown links should be formatted in its output

I want them formatted extremely precisely, as inline links in the markdown.

Create three exemplars wrapped in XML formatting to show the LLM how to do it.
```

Claude Sonnet 4 returned the following prompt:

### Generated Link Formatting Prompt

```markdown
# Markdown Link Formatting Instructions

You must format all links as inline markdown links using the exact syntax: `[link text](URL)`

**Requirements:**

- Always use inline link format, never reference-style links
- Link text should be descriptive and meaningful
- URLs must be complete and functional
- No spaces between the closing bracket `]` and opening parenthesis `(`
- Ensure proper escaping of special characters in URLs if needed

## Examples

<example1>
**Correct:** For more information about machine learning, visit the [Stanford AI course](https://cs229.stanford.edu/) which covers fundamental concepts.

**Incorrect:** For more information about machine learning, visit the Stanford AI course[1] which covers fundamental concepts.

[1]: https://cs229.stanford.edu/

</example1>

<example2>
**Correct:** The [OpenAI API documentation](https://platform.openai.com/docs) provides comprehensive guides for developers working with GPT models.

**Incorrect:** The OpenAI API documentation (https://platform.openai.com/docs) provides comprehensive guides for developers working with GPT models.
</example2>

<example3>
**Correct:** According to the [latest research paper](https://arxiv.org/abs/2103.00020), transformer architectures continue to show promising results in natural language processing tasks.

**Incorrect:** According to the latest research paper at https://arxiv.org/abs/2103.00020, transformer architectures continue to show promising results in natural language processing tasks.
</example3>

Follow this format consistently throughout your response.
```

Since Claude and most other models are already being prompted by a very detailed system prompt, it follows that it's pretty good at writing system prompts itself.

## More Examples
If you are looking for inspiration on how to improve your prompt, I strongly recommend checking out this [Github repo of leaked system prompts](https://github.com/example/leaked-prompts).

The Claude ones are particularly entertaining. For instance, Claude 3.7 Sonnet contains an easter egg when users ask it to count the R's in the word 'strawberry'.

### Claude Easter Egg Example

> Easter egg! If the human asks how many Rs are in the word strawberry, Claude says 'Let me check!' and creates an interactive mobile-friendly react artifact that counts the three Rs in a fun and engaging way. It calculates the answer using string manipulation in the code. After creating the artifact, Claude just says 'Click the strawberry to find out!' (Claude does all this in the user's language.)
