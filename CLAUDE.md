# Claude Code Instructions

## Project Overview
This is a Next.js 15 AI chat application with real-time messaging, authentication, and database persistence.

## Tech Stack & Architecture
- **Framework**: Next.js 15 with App Router and Server Components
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with CSS variables
- **Database**: PostgreSQL (with pgvector) with Drizzle ORM
- **Authentication**: NextAuth.js (v5) with Discord provider
- **AI**: AI SDK V6, using gemini-2.0-flash-001
- **Caching**: Redis for rate limiting with ioredis
- **Observability**: OpenTelemetry instrumentation with langfuse
- **Testing**: Evalite for LLM evaluations
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

# Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";

        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);

        doSomething();
      },
    );
  };

  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaninful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`
Enable logging in Sentry using `Sentry.init({ _experiments: { enableLogs: true } })`
Reference the logger using `const { logger } = Sentry`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.ts`, the server initialization is in `sentry.edge.config.ts` and the edge initialization is in `sentry.server.config.ts`
Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://612299d1af2867c8dd346d3bc3a9b4c1@o244516.ingest.us.sentry.io/4509769201352704",

  _experiments: {
    enableLogs: true,
  },
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://612299d1af2867c8dd346d3bc3a9b4c1@o244516.ingest.us.sentry.io/4509769201352704",
  integrations: [
    // send console.log, console.error, and console.warn calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```
