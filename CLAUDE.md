# Claude Code Instructions

## Project Overview
This is a Next.js 15 AI chat application with real-time messaging, authentication, and database persistence.

## Tech Stack & Architecture
- **Framework**: Next.js 15 with App Router and Server Components, context7 id: `/vercel/next.js` & `react.dev` for React
- **Language**: TypeScript (strict mode), context7 id: `/microsoft/typescript`
- **Styling**: Tailwind CSS with CSS variables, shadcn/ui components, context7 id: `/shadcn-ui/ui`
- **Database**: PostgreSQL (with pgvector) with Drizzle ORM, context7 id: `/drizzle-team/drizzle-orm-docs`
- **Authentication**: NextAuth.js (v5) with Discord provider, context7 id: `/nextauthjs/next-auth`
- **AI**: AI SDK, using gemini-2.0-flash-001, context7 id: `/vercel/ai`
- **Caching**: Redis for rate limiting with ioredis, context7 id: `/redis/ioredis`
- **Observability**: OpenTelemetry instrumentation with langfuse, context7 id: `langfuse_com-docs`
- **Testing**: Evalite for LLM evaluations, context7 id: `/mattpocock/evalite`
- **Development**: We use `docker-compose.yml` for local development

## Code Standards & Requirements

### TypeScript
- Prefer TypeScript over JavaScript
- Where possible, adjust type imports so they use 'type' on the entire import, not just the specific named imports:
```typescript
import { type Message } from "ai"; -> import type { Message } from "ai";
```
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object shapes
- Use proper generics for reusable components
- Export types alongside components
- Use proper return types for async functions

### Workflow
- Use context7 if you need documentation and examples
- Bash commands (run after your changes in order fix before going to next step):
```bash
npm run lint:fix: Fix linting issues automatically
npm run typecheck: Run TypeScript type checking
npm run format:write: Format the codebase using Prettier
```

### Styling
- Use Tailwind CSS utility classes only
- Use theme tokens (e.g., `text-foreground`, `bg-background`)
- No hardcoded values (colors, spacing, etc.)
- Responsive design with mobile-first approach
- Use CSS variables from `~/styles/globals.css`
- For className with some condition please use `cn` utility from `~/lib/utils` to merge classes and resolve conflicts:
```typescript
import { cn } from "~/lib/utils";

cn('paragraph-sm text-nowrap font-bold', {
  'text-brand-blue': report.status === 'In Progress',
  'text-brand-green-dark': report.status === 'Ready',
  'text-brand-red': report.status === 'Failed'
})
```

If a ternary is enough then do it like this:
```typescript
 cn(
  'relative flex min-w-50 cursor-pointer flex-col flex-nowrap gap-2 rounded-md p-4 shadow-xs',
  step === index
    ? 'bg-gradient-to-b from-brand-blue to-brand-blue-dark text-white'
    : 'bg-gray-50 text-black'
)
```

Or if there is class needed only for one condition:
```typescript
cn('flex', isBig && 'text-2xl')
```

#### UI Components
- Use shadcn/ui components exclusively for UI elements
- Follow the "new-york" style variant
- Use Lucide icons for all iconography
- Implement proper accessibility attributes
- Use CSS variables for theming (no hardcoded colors/spacing)
- The config can be found in `components.json`

#### HTML & Accessibility
- **Use semantic HTML elements** instead of generic divs whenever possible some examples:
  - `<main>` for main content areas
  - `<section>` for distinct content sections
  - `<article>` for standalone content pieces
  - `<aside>` for sidebar content
  - `<nav>` for navigation menus
  - `<header>` and `<footer>` for page/section headers and footers
  - `<h1>` - `<h6>` for proper heading hierarchy
  - `<button>` for interactive elements (not divs with click handlers)
  - `<ul>`, `<ol>`, `<li>` for lists
  - `<p>` for paragraphs of text
- **Minimize HTML structure** - avoid unnecessary wrapper divs
- **Ensure proper heading hierarchy** - don't skip heading levels
- **Add appropriate ARIA attributes** when semantic HTML isn't sufficient


### File Organization
- Follow the established alias structure (`~/components`, `~/lib`, etc.)
- Separate server and client components clearly
- Use proper barrel exports for cleaner imports
- Group related functionality in appropriate directories

### Database & Server
- Use Drizzle ORM for all database operations
- Implement proper error handling and validation
- Use server actions for form submissions
- Implement proper rate limiting
- Add telemetry for observability
- Database schema can be found in `src/server/db/schema.ts`

### AI Integration
- Use streaming responses for better UX
- Implement proper error boundaries
- Handle loading states gracefully
- Use structured outputs when possible


## Writing Tests

This project uses **Vitest** as its primary testing framework. When writing tests, aim to follow existing patterns. Key conventions include:


### Test Structure and Framework

- **Framework**: All tests are written using Vitest (`describe`, `it`, `expect`, `vi`).
- **File Location**: Test files (`*.test.ts` for logic, `*.test.tsx` for React components) are co-located with the source files they test.
- **Configuration**: Test environments are defined in `vitest.config.ts` files.
- **Setup/Teardown**: Use `beforeEach` and `afterEach`. Commonly, `vi.resetAllMocks()` is called in `beforeEach` and `vi.restoreAllMocks()` in `afterEach`.

### Mocking (`vi` from Vitest)

- **ES Modules**: Mock with `vi.mock('module-name', async (importOriginal) => { ... })`. Use `importOriginal` for selective mocking.
  - _Example_: `vi.mock('os', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, homedir: vi.fn() }; });`
- **Mocking Order**: For critical dependencies (e.g., `os`, `fs`) that affect module-level constants, place `vi.mock` at the _very top_ of the test file, before other imports.
- **Hoisting**: Use `const myMock = vi.hoisted(() => vi.fn());` if a mock function needs to be defined before its use in a `vi.mock` factory.
- **Mock Functions**: Create with `vi.fn()`. Define behavior with `mockImplementation()`, `mockResolvedValue()`, or `mockRejectedValue()`.
- **Spying**: Use `vi.spyOn(object, 'methodName')`. Restore spies with `mockRestore()` in `afterEach`.

## React
### Role

You are a React assistant that helps users write more efficient and optimizable React code. You specialize in identifying patterns that enable React Compiler to automatically apply optimizations, reducing unnecessary re-renders and improving application performance.

### Follow these guidelines in all code you produce and suggest

Use functional components with Hooks: Do not generate class components or use old lifecycle methods. Manage state with useState or useReducer, and side effects with useEffect (or related Hooks). Always prefer functions and Hooks for any new component logic.

Keep components pure and side-effect-free during rendering: Do not produce code that performs side effects (like subscriptions, network requests, or modifying external variables) directly inside the component's function body. Such actions should be wrapped in useEffect or performed in event handlers. Ensure your render logic is a pure function of props and state.

Respect one-way data flow: Pass data down through props and avoid any global mutations. If two components need to share data, lift that state up to a common parent or use React Context, rather than trying to sync local state or use external variables.

Never mutate state directly: Always generate code that updates state immutably. For example, use spread syntax or other methods to create new objects/arrays when updating state. Do not use assignments like state.someValue = ... or array mutations like array.push() on state variables. Use the state setter (setState from useState, etc.) to update state.

Accurately use useEffect and other effect Hooks: whenever you think you could useEffect, think and reason harder to avoid it. useEffect is primarily only used for synchronization, for example synchronizing React with some external state. IMPORTANT - Don't setState (the 2nd value returned by useState) within a useEffect as that will degrade performance. When writing effects, include all necessary dependencies in the dependency array. Do not suppress ESLint rules or omit dependencies that the effect's code uses. Structure the effect callbacks to handle changing values properly (e.g., update subscriptions on prop changes, clean up on unmount or dependency change). If a piece of logic should only run in response to a user action (like a form submission or button click), put that logic in an event handler, not in a useEffect. Where possible, useEffects should return a cleanup function.

Follow the Rules of Hooks: Ensure that any Hooks (useState, useEffect, useContext, custom Hooks, etc.) are called unconditionally at the top level of React function components or other Hooks. Do not generate code that calls Hooks inside loops, conditional statements, or nested helper functions. Do not call Hooks in non-component functions or outside the React component rendering context.

Use refs only when necessary: Avoid using useRef unless the task genuinely requires it (such as focusing a control, managing an animation, or integrating with a non-React library). Do not use refs to store application state that should be reactive. If you do use refs, never write to or read from ref.current during the rendering of a component (except for initial setup like lazy initialization). Any ref usage should not affect the rendered output directly.

Prefer composition and small components: Break down UI into small, reusable components rather than writing large monolithic components. The code you generate should promote clarity and reusability by composing components together. Similarly, abstract repetitive logic into custom Hooks when appropriate to avoid duplicating code.

Optimize for concurrency: Assume React may render your components multiple times for scheduling purposes (especially in development with Strict Mode). Write code that remains correct even if the component function runs more than once. For instance, avoid side effects in the component body and use functional state updates (e.g., setCount(c => c + 1)) when updating state based on previous state to prevent race conditions. Always include cleanup functions in effects that subscribe to external resources. Don't write useEffects for "do this when this changes" side effects. This ensures your generated code will work with React's concurrent rendering features without issues.

Optimize to reduce network waterfalls - Use parallel data fetching wherever possible (e.g., start multiple requests at once rather than one after another). Leverage Suspense for data loading and keep requests co-located with the component that needs the data. In a server-centric approach, fetch related data together in a single request on the server side (using Server Components, for example) to reduce round trips. Also, consider using caching layers or global fetch management to avoid repeating identical requests.

Rely on React Compiler - useMemo, useCallback, and React.memo can be omitted if React Compiler is enabled. Avoid premature optimization with manual memoization. Instead, focus on writing clear, simple components with direct data flow and side-effect-free render functions. Let the React Compiler handle tree-shaking, inlining, and other performance enhancements to keep your code base simpler and more maintainable.

Design for a good user experience - Provide clear, minimal, and non-blocking UI states. When data is loading, show lightweight placeholders (e.g., skeleton screens) rather than intrusive spinners everywhere. Handle errors gracefully with a dedicated error boundary or a friendly inline message. Where possible, render partial data as it becomes available rather than making the user wait for everything. Suspense allows you to declare the loading states in your component tree in a natural way, preventing “flash” states and improving perceived performance.

### Process

1. Analyze the user's code for optimization opportunities:
   - Check for React anti-patterns that prevent compiler optimization
   - Look for component structure issues that limit compiler effectiveness
   - Think about each suggestion you are making and consult React docs for best practices

2. Provide actionable guidance:
   - Explain specific code changes with clear reasoning
   - Show before/after examples when suggesting changes
   - Only suggest changes that meaningfully improve optimization potential

### Optimization Guidelines

- State updates should be structured to enable granular updates
- Side effects should be isolated and dependencies clearly defined
