# AI App Template

A modern AI-powered application built with Next.js, PostgreSQL (with pgvector), Redis, and Drizzle ORM. This application includes authentication, database management, and chat functionality.

## 🚀 Features

- **Next.js 15** with App Router and Turbo mode
- **PostgreSQL** with pgvector extension for vector operations
- **Redis** for caching and session management
- **Drizzle ORM** for type-safe database operations
- **NextAuth.js** for authentication
- **TailwindCSS** for styling
- **TypeScript** for type safety
- **Docker** support for easy deployment


## 🚀 Quick Start

The easiest way to run the entire application stack:

1. **Clone and setup**:
   ```bash
   git clone <your-repo-url>
   cd ai-app
   npm install
   ```

2. **Configure environment**:
   Duplicate the `.env.example` file to `.env` and update the values as needed.

3. **Start everything**:
   ```bash
   npm run dev
   ```

That's it! The dev command automatically:
- **Starts services** - PostgreSQL and Redis via docker compose
- **Waits for services** - Ensures they're healthy before proceeding
- **Starts Next.js** - Runs the app locally with Turbo mode

### What happens automatically:

1. **Docker services start** - PostgreSQL with pgvector and Redis start in background
2. **Health checks** - Waits for services to be ready
3. **Next.js starts** - Development server starts with hot reloading
4. **Database migrations** - Applied when the app connects to the database

### Access your application:

- **App**: http://localhost:3000
- **Database**: localhost:5432 (postgres/password)
- **Redis**: localhost:6379 (password: redis-pw)
- **Database GUI**: Run `npm run db:studio` then visit https://local.drizzle.studio


## 📦 Available Scripts

### Development
- `npm run dev` - Start Docker services and Next.js dev server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run preview` - Build and start production server

### Database Operations
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run pending migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript type checking
- `npm run format:write` - Format code with Prettier
- `npm run format:check` - Check code formatting

## ️ Database Migrations with Drizzle

### Creating Migrations

1. **Modify your schema** in `src/server/db/schema.ts`

2. **Generate migration**
   ```bash
   npm run db:generate
   ```

3. **Review the generated migration** in the `drizzle/` directory

4. **Apply the migration**
```bash
npm run db:migrate
```

### Database Studio

Access Drizzle Studio for visual database management:
```bash
npm run db:studio
```

### Push Schema (Development Only)

For rapid prototyping, you can push schema changes directly:
```bash
npm run db:push
```
The schema can be found at `src/server/db/schema.ts`

⚠️ **Warning**: This bypasses migration generation and should only be used in development.

## 🐳 Docker Configuration

The `docker-compose.yml` provides the required services:
- **PostgreSQL** with pgvector extension
- **Redis** for caching and sessions
- **Pre-configured environment variables**
- **Health checks** to ensure services are ready
- **Volume persistence** for database data

The Next.js application runs locally for faster development with hot-reloading.

### Common Docker Commands

```bash
# Start services only (PostgreSQL + Redis)
docker-compose up -d

# Stop all services
docker-compose down

# View service logs
docker-compose logs -f

# Start everything (services + Next.js app)
npm run dev
```

## 🔒 Authentication

This app uses NextAuth.js for authentication. Configure providers in `src/server/auth/config.ts`.

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── server/
│   ├── auth/           # Authentication configuration
│   ├── db/             # Database schema and connection
│   └── redis/          # Redis configuration
├── styles/             # Global styles
└── env.js              # Environment variable validation
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with pgvector extension
- **ORM**: Drizzle ORM
- **Cache**: Redis with ioredis
- **Auth**: NextAuth.js
- **Styling**: TailwindCSS
- **Language**: TypeScript
- **Deployment**: Docker & Docker Compose

## 🚀 Deployment

### Production Environment Variables

For production, update the environment variables in `docker-compose.yml`:
- `AUTH_SECRET` - Change to a secure random string (required!)
- `NODE_ENV=production`
- `NEXTAUTH_URL` - Set to your production domain

### Authentication Configuration

The application supports Discord authentication with user restrictions:

- `AUTH_DISCORD_ID` - Your Discord application client ID
- `AUTH_DISCORD_SECRET` - Your Discord application client secret
- `ALLOWED_USER` - Discord username that is allowed to sign in (only this user can access the app)

When an unauthorized user attempts to sign in, they will be redirected back to the homepage with an error message explaining that access is denied.

# Sucess Criteria

## Core Metrics for DeepSearch

For our DeepSearch application, we need to nail down several key metrics:

- **Factual**: The answer must be correct
- **Relevant**: The app should stay focused on the user's question
- **Sourced**: Answers should include and cite their sources
- **Up to date**: The app should use the most recent information
- **Fast (ish)**: Response times should be reasonable (with some built-in latency expectations)

These metrics will form the foundation of our evals, ensuring they closely match our production application's quality.

## Business and Error Metrics

Beyond our core evals, we need to track business-critical metrics:

- Cost per query
- Cost per user
- Conversion rates

While these can't be evaluated directly in our evals, they're crucial for overall success criteria.

## Setting Goals vs. Tracking Progress

There's an important distinction between choosing metrics and setting goals for those metrics. In many contexts, you won't need to set specific goals at all.

**For example:**

- **Startups**: Focus on proving improvement over time, using metrics to drive development and secure funding
- **Agencies**: Need concrete success criteria and goals for contract bidding

## Establishing Baselines

When you do need specific numbers, establishing a baseline is crucial. For a DeepSearch app, you might:

- Test similar implementations
- Compare against human performance
- Track historical performance

Instead of promising specific numbers, "beating the baseline" is often a more useful framing. This lets you promise improvement and track progress over time.

## Impact on System Design

Your success criteria will directly impact your system design. I've described this elsewhere as the **staircase of complexity**.

The staircase ranges from:

- **Simple techniques** at the top (zero-shot prompting, temperature adjustments)
- **Complex, costly techniques** at the bottom (fine-tuning)

Your success criteria determine how far down this staircase you need to go. For instance:

- **High factuality requirements** → deeper down the staircase
- **Simple tasks** (tweets, summaries) → simpler approaches suffice

## Creating a Culture of Improvement

For these criteria to be useful, they need to be actionable and extremely visible in the organization. A prominent AI startup implements this by:

- Rolling up metrics every few hours
- Sending updates to Slack
- Treating metric degradations as incidents
- Using success criteria as a driving force for development


## Evals

This application uses a tiered evaluation system with three different dataset sizes optimized for different stages of development:

### Dataset Organization

Our eval datasets are split into three separate files, each serving a specific purpose:

| Dataset | File | Size | Purpose | When to Use |
|---------|------|------|---------|-------------|
| **Dev** | `evals/dev.ts` | 4-10 cases | Local testing of toughest cases | During development |
| **CI** | `evals/ci.ts` | 5-20 cases | Pre-deployment testing | Before deployment |
| **Regression** | `evals/regression.ts` | 8+ cases | Comprehensive regression testing | Periodically |

#### Dataset Structure

Each dataset file exports an array of test cases:

```typescript
export const devData: { input: Message[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        content: "Your test question here",
      },
    ],
    expected: "Expected response criteria",
  },
];
```

### Running Evals

The eval system automatically selects the appropriate dataset based on the `EVAL_DATASET` environment variable:

#### Development (Default)
```bash
npm run evals
# or explicitly
EVAL_DATASET=dev npm run evals
```
Runs only the **dev dataset** (4 toughest cases) for quick local testing.

#### CI/Pre-deployment
```bash
EVAL_DATASET=ci npm run evals
```
Runs **dev + ci datasets** (9 total cases) for pre-deployment validation.

#### Regression Testing
```bash
EVAL_DATASET=regression npm run evals
```
Runs **dev + ci + regression datasets** (17+ total cases) for comprehensive testing.

### Eval Configuration

The dataset selection logic is implemented in `evals/initial.eval.ts`:

- **Dev**: Contains the most challenging multi-hop reasoning questions
- **CI**: Adds basic functionality tests
- **Regression**: Adds comprehensive edge cases and historical scenarios

This tiered approach ensures:
- **Fast feedback** during development (dev dataset)
- **Adequate coverage** before deployment (ci dataset)
- **Comprehensive protection** against regressions (full dataset)

## 🤖 Agent Loop Architecture

This application implements a sophisticated agent loop system that combines the flexibility of agentic behavior with the reliability of structured workflows. The agent system performs deep research by iteratively searching, scraping, and analyzing web content until it has sufficient information to answer user queries.

### How the Agent Loop Works

The core agent loop is implemented in `src/server/agent/run-agent-loop.ts` and follows this process:

#### 1. **Initialization & Context Setup**
- Creates a `SystemContext` to track conversation history, search results, and loop state
- Performs optional guardrail checks for content safety
- Sets maximum iteration limit (4 steps) to prevent infinite loops

#### 2. **Iterative Research Loop**
```
while (!shouldStop()) {
  ↓
  Query Rewriting → Web Search → Content Scraping → Summarization → Decision
  ↓
  Continue or Answer?
}
```

#### 3. **Query Rewriting Phase**
- Uses `queryRewriter()` to break down complex questions into focused search queries
- Generates multiple targeted queries from the user's original question
- Optimizes queries for better search results

#### 4. **Parallel Web Search**
- Executes multiple search queries simultaneously using Serper API
- Fetches top 3 results per query for comprehensive coverage
- Deduplicates sources by URL to avoid redundant processing

#### 5. **Content Extraction & Processing**
- Scrapes full content from discovered URLs using `bulkCrawlWebsites()`
- Processes multiple URLs in parallel for efficiency
- Handles scraping failures gracefully with fallback content

#### 6. **Intelligent Summarization**
- Summarizes each scraped page using `summarizeURL()`
- Contextualizes summaries based on original query and conversation history
- Extracts relevant information while maintaining source attribution

#### 7. **Decision Engine**
- Uses `getNextAction()` to analyze gathered information against original query
- Determines if sufficient information exists to provide a complete answer
- Generates structured feedback about information gaps when continuing

#### 8. **Answer Generation**
- Produces final answer when sufficient information is available
- Includes source citations and structured formatting
- Handles both intermediate answers (within loop) and final answers (at step limit)

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **SystemContext** | `system-context.ts` | Manages loop state, search history, and token usage |
| **Agent Loop** | `run-agent-loop.ts` | Main orchestration logic and iteration control |
| **Decision Engine** | `get-next-action.ts` | Determines whether to continue searching or answer |
| **Query Rewriter** | `query-rewriter.ts` | Breaks down complex queries into searchable terms |
| **URL Summarizer** | `summarize-url.ts` | Extracts relevant content from scraped pages |
| **Deep Search** | `deep-search.ts` | High-level interface for the agent system |

### Loop State Management

The `SystemContext` class tracks:
- **Step Counter**: Current iteration (max 4 steps)
- **Search History**: All queries, results, and summaries
- **Message History**: Full conversation context
- **Token Usage**: LLM usage tracking across all operations
- **Feedback**: Decision engine feedback for next iterations

### Agent vs. Workflow Balance

This implementation strikes a balance between agentic autonomy and workflow predictability:

**Agentic Elements:**
- LLM decides when sufficient information is gathered
- Dynamic query generation based on information gaps
- Flexible content summarization based on relevance

**Workflow Elements:**
- Fixed iteration limit prevents infinite loops
- Structured decision schema (`continue` vs `answer`)
- Predictable search → scrape → summarize → decide pattern
- Parallel processing for consistent performance

### Real-time Frontend Updates

The agent loop provides real-time feedback to the frontend through structured message parts:

```typescript
// Source discovery
{ type: "data-sources", data: uniqueSources }

// Action updates
{ type: "data-new-action", data: nextAction }
```

This enables the UI to show:
- Live source discovery as they're found
- Current agent reasoning and next steps
- Progress through the research process

### Performance Optimizations

- **Parallel Processing**: Search queries and content scraping run concurrently
- **Source Deduplication**: Prevents redundant processing of the same URLs
- **Bounded Execution**: Maximum 4 iterations prevents runaway costs
- **Streaming Responses**: Provides immediate feedback while processing

## 🧭 Agents vs. Workflows

When designing AI-powered applications, a key architectural decision is how much control-flow power to give to the LLM. This is often framed as the difference between "agents" and "workflows."

### Agents

An **agentic** system gives the LLM significant autonomy to decide the next action at each step. The LLM can choose, for example, whether to search the web, scrape a URL, or generate an answer. It may also decide how many searches to perform, which URLs to scrape, and when to generate a final answer. The more control-flow decisions are handed to the LLM, the more flexible—but also less predictable—the system becomes. Running the same query multiple times may yield different behaviors and outcomes.

See this article from anthropic [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)


### Workflows

A **workflow** approach, by contrast, is deterministic and predictable. The sequence of steps is predefined in code, and the LLM is restricted to follow this path or make only limited decisions. This reduces variability and makes the application’s behavior more consistent and reliable.

### Tuning the Agentic Dial

There is a spectrum between fully agentic and fully workflow-driven systems. You can "turn the dial" by:
- Reducing the LLM’s decision space
- Combining multiple tool calls into fixed workflows
- Restricting the LLM to follow a predetermined path

Agentic systems offer flexibility and adaptability, while workflow-driven systems provide predictability and repeatability. The right balance depends on your application’s needs and the desired trade-off between flexibility and control.
