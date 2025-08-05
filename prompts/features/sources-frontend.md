Now we've built our evaluator optimizer loop, along with our query rewriter, let's come back around to the frontend.

The current problem with our setup is that we don't receive anything from the frontend until an action is taken:

- Query rewriting: **no feedback**
- Searching, summarizing: **no feedback**
- Choosing the next action: finally, **feedback**

In other words, we need to show something while the query rewriter is running.

## What do we show?

Currently, we have two assets coming from the query rewriting step:

- A plan
- The queries to search for

One option would be simply to show the plan, similar to how we're showing the reasoning tokens from the `getNextAction` function.

But let's be a touch more ambitious.

One thing I really like from observing other DeepResearch implementations is the way they display their sources.

<Video resourceId="deepresearchsourcesdemonstration-nZpvn6QSO.mp4" />

They're often displayed as a list of cards, with a favicon, title and snippet. Let's copy that.

## How to show the sources?

To make this work, we're going to collect all of the sources during the search/summarization step.

We're then going to write those into an annotation using our existing `writeMessageAnnotation` setup.

Note that we want to do this as soon as possible - as soon as the Google searches have been completed. This means we should do this _before_ we start summarizing.

Then we'll display those sources in a beautiful grid layout in the frontend. They should be displayed as steps, similar to how we're displaying the next actions taken. And they should be hidden by default, only shown when the user clicks on the corresponding step.

## Steps to complete

- Look for where we do our search/summarization
- Look for where we declare the types for our custom annotation
- Grab the sources we're collecting from `serper`
- Create a custom annotation type for capturing the favicon and title. Tip: use a [discriminated union](https://www.totaltypescript.com/discriminated-unions-are-a-devs-best-friend).
- Make sure that only _one_ annotation is written per step. Our serper calls are parallelized, so we need to make sure that only one 'display sources' annotation is triggered per step.
- Display them in the frontend in the `ChatMessage` component
