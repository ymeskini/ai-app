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

The easiest way to run the entire application stack - just one command:

Duplicate the `.env.example` file to `.env` and update the values as needed.

```bash
git clone <your-repo-url>
cd ai-app
docker-compose up
```

That's it! The `docker-compose.yml` file includes:
- **PostgreSQL** with pgvector extension
- **Redis** for caching
- **Next.js application** in development mode

### What happens automatically:

1. **Services start** - PostgreSQL, Redis, and the Next.js app
2. **Dependencies install** - npm install runs automatically
3. **Database migrations** - Applied when the app starts
4. **Health checks** - Ensures services are ready before starting the app

### Access your application:

- **App**: http://localhost:3000
- **Database**: localhost:5432 (postgres/password)
- **Redis**: localhost:6379 (password: redis-pw)
- **Database GUI**: Run `docker-compose exec app npm run db:studio` then visit https://local.drizzle.studio


## 📦 Available Scripts

### Development
- `npm run dev` - Start development server with Turbo
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
docker-compose exec app npm run db:migrate
```

### Database Studio

Access Drizzle Studio for visual database management:
```bash
docker-compose exec app npm run db:studio
```

### Push Schema (Development Only)

```bash
docker-compose exec app npm run db:push
```

For rapid prototyping, you can push schema changes directly:
```bash
docker-compose exec app npm run db:push
```
The schema can be found at `src/server/db/schema.ts`

⚠️ **Warning**: This bypasses migration generation and should only be used in development.

## 🐳 Docker Configuration

The `docker-compose.yml` includes everything you need:
- **PostgreSQL** with pgvector extension
- **Redis** for caching and sessions
- **Next.js application** in development mode
- **Pre-configured environment variables**
- **Health checks** to ensure services start in the correct order
- **Volume mounts** for development hot-reloading

### Common Docker Commands

```bash
# Start all services (with logs visible)
docker-compose up

# Start all services in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start (after code changes to Dockerfile)
docker-compose up --build

# Access database GUI
docker-compose exec app npm run db:studio
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

### Docker Deployment

```bash
docker-compose up -d
```

The application includes health checks and will automatically run migrations on startup.

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
