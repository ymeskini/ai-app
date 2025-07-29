# Copilot Instructions

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

## Code Standards & Requirements

### UI Components
- Use shadcn/ui components exclusively for UI elements
- Follow the "new-york" style variant
- Use Lucide icons for all iconography
- Implement proper accessibility attributes
- Use CSS variables for theming (no hardcoded colors/spacing)
- Use context7 if you need documentation and examples

### TypeScript
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object shapes
- Use proper generics for reusable components
- Export types alongside components
- Use proper return types for async functions

### Styling
- Use Tailwind CSS utility classes only
- Use theme tokens (e.g., `text-foreground`, `bg-background`)
- No hardcoded values (colors, spacing, etc.)
- Responsive design with mobile-first approach
- Use CSS variables from globals.css

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

### AI Integration
- Use streaming responses for better UX
- Implement proper error boundaries
- Handle loading states gracefully
- Use structured outputs when possible
