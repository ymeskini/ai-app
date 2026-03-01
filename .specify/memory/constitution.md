<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)

  Added principles:
    - I. Code Quality & Type Safety
    - II. Testing Standards
    - III. User Experience Consistency
    - IV. Performance Requirements

  Added sections:
    - Technology & Architecture Constraints
    - Development Workflow & Quality Gates
    - Governance

  Removed sections: N/A (initial version)

  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
      (Constitution Check section already references constitution gates)
    - .specify/templates/spec-template.md ✅ no changes needed
      (Success Criteria section already supports measurable outcomes)
    - .specify/templates/tasks-template.md ✅ no changes needed
      (Polish phase already includes performance optimization and
      security hardening tasks)

  Follow-up TODOs: None
-->

# AI App Constitution

## Core Principles

### I. Code Quality & Type Safety

- All source code MUST be written in TypeScript with strict mode
  enabled.
- Type imports MUST use the `import type { X }` form (whole-import
  style), never `import { type X }`.
- Interfaces MUST be preferred over type aliases for object shapes.
- Every module MUST pass `npm run lint:fix`, `npm run typecheck`,
  and `npm run format:write` before merge.
- No `any` types are permitted unless accompanied by a justifying
  comment and a tracked tech-debt issue.
- Server and client components MUST be clearly separated; shared
  code MUST reside under the established alias structure
  (`~/components`, `~/lib`, etc.).
- Security vulnerabilities (OWASP Top 10) MUST be addressed
  immediately upon discovery. `Sentry.captureException` MUST be
  used in all catch blocks for production error tracking.

### II. Testing Standards

- Unit tests MUST use Vitest and be co-located with source files
  (`*.test.ts` / `*.test.tsx`).
- Mocking MUST follow the project conventions: `vi.mock` with
  `importOriginal` for selective mocking, `vi.hoisted` for
  dependencies needed before imports, and `vi.spyOn` with
  `mockRestore()` in `afterEach`.
- `beforeEach` MUST call `vi.resetAllMocks()` and `afterEach`
  MUST call `vi.restoreAllMocks()`.
- LLM evaluations MUST use Evalite with the tiered dataset system:
  dev (4-10 cases), CI (5-20 cases), regression (8+ cases).
- New features that touch AI pipelines MUST include at least one
  eval case in the dev dataset before merge.
- Test files MUST NOT import production secrets or require running
  infrastructure; mock external dependencies.

### III. User Experience Consistency

- All UI elements MUST use shadcn/ui components (new-york variant)
  exclusively; custom components are permitted only when no
  shadcn/ui equivalent exists.
- Icons MUST use Lucide; no other icon libraries are permitted.
- Styling MUST use Tailwind CSS utility classes with theme tokens
  (`text-foreground`, `bg-background`, etc.) and CSS variables
  from `~/styles/globals.css`. Hardcoded color or spacing values
  are prohibited.
- Conditional class merging MUST use the `cn` utility from
  `~/lib/utils`.
- Semantic HTML elements (`<main>`, `<nav>`, `<section>`,
  `<article>`, `<button>`, etc.) MUST be used instead of generic
  `<div>` wrappers wherever applicable.
- Proper heading hierarchy MUST be maintained (no skipped levels).
- ARIA attributes MUST be added when semantic HTML alone is
  insufficient for accessibility.
- Responsive design MUST follow a mobile-first approach.

### IV. Performance Requirements

- AI responses MUST use streaming to provide immediate user
  feedback; no blocking request-response patterns for LLM calls.
- The agent loop MUST enforce a bounded iteration limit (currently
  4 steps maximum) to prevent runaway cost and latency.
- Parallel processing MUST be used for independent I/O operations
  (search queries, content scraping, database reads).
- Source deduplication MUST be applied before processing to avoid
  redundant work.
- Rate limiting MUST be enforced via Redis for all public-facing
  API endpoints.
- OpenTelemetry spans MUST be created for meaningful user actions
  (button clicks, API calls, agent loop iterations) with relevant
  attributes attached.
- Client bundle size MUST NOT regress without explicit
  justification; server components MUST be preferred over client
  components when interactivity is not required.

## Technology & Architecture Constraints

- **Runtime**: Next.js 15 with App Router and Server Components.
- **Database**: PostgreSQL with pgvector via Drizzle ORM. All
  schema changes MUST go through Drizzle migrations
  (`npm run db:generate` then `npm run db:migrate`).
  `npm run db:push` is permitted in development only.
- **Authentication**: NextAuth.js v5 with Discord provider.
  Auth configuration resides in `src/server/auth/config.ts`.
- **Caching**: Redis via ioredis for rate limiting and session
  management.
- **AI SDK**: Vercel AI SDK v6 with `gemini-2.0-flash-001` as the
  default model.
- **Observability**: Sentry (with `@sentry/nextjs`) for error
  tracking, structured logging, and performance monitoring.
  Langfuse for LLM-specific tracing.
- **Local Development**: `docker-compose.yml` MUST be the single
  entry point for infrastructure services; `npm run dev` starts
  everything.

## Development Workflow & Quality Gates

- Every feature branch MUST pass three automated gates before
  merge:
  1. `npm run lint:fix` exits cleanly.
  2. `npm run typecheck` exits cleanly.
  3. `npm run format:write` produces no diff.
- Database schema changes MUST include generated migration files
  committed alongside the schema update.
- AI pipeline changes MUST include updated or new eval cases and
  MUST NOT degrade existing eval scores without documented
  justification.
- All pull requests MUST include a description of what changed,
  why, and how to test it.
- Commit messages MUST be concise and follow conventional style
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Governance

- This constitution supersedes conflicting guidance in other
  project documents. Where CLAUDE.md provides additional detail
  consistent with these principles, both apply.
- Amendments MUST be documented with a version bump, rationale,
  and updated `LAST_AMENDED_DATE`.
- Version follows semantic versioning:
  - MAJOR: principle removal or backward-incompatible redefinition.
  - MINOR: new principle or materially expanded guidance.
  - PATCH: clarifications, wording, and non-semantic refinements.
- All code reviews MUST verify compliance with these principles.
  Violations MUST be resolved before merge.
- Complexity beyond what these principles prescribe MUST be
  justified in the PR description.

**Version**: 1.0.0 | **Ratified**: 2026-02-28 | **Last Amended**: 2026-02-28
