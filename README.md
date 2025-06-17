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

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Docker and Docker Compose
- Git

## � Quick Start

The easiest way to run the entire application stack - just one command:

```bash
git clone <your-repo-url>
cd ai-app
docker-compose up
```

That's it! The `docker-compose.yml` file includes:
- **PostgreSQL** with pgvector extension
- **Redis** for caching
- **Next.js application** in development mode
- **All environment variables** pre-configured

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

### For production:

Change the `AUTH_SECRET` environment variable in `docker-compose.yml` to a secure random string.

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

### Docker Deployment

```bash
docker-compose up -d
```

The application includes health checks and will automatically run migrations on startup.
