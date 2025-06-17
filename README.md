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

## 🛠️ Quick Start with Docker Compose

The easiest way to run the entire application stack:

1. **Clone and setup**
   ```bash
   git clone <your-repo-url>
   cd ai-app
   cp .env.example .env
   ```

2. **Start everything with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Access the application**
   - App: http://localhost:3000
   - Drizzle Studio: http://localhost:4983 (run `npm run db:studio`)

## 🔧 Manual Setup

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai-app-template"

# Redis
REDIS_URL="redis://:redis-pw@localhost:6379"

# Auth
AUTH_SECRET="your-auth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

### Database Setup

1. **Start PostgreSQL with pgvector**
   ```bash
   ./start-database.sh
   ```
   Or manually with Docker:
   ```bash
   docker run -d \
     --name ai-app-template-postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=ai-app-template \
     -p 5432:5432 \
     pgvector/pgvector:pg17
   ```

2. **Generate and run migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

### Redis Setup

1. **Start Redis**
   ```bash
   ./start-redis.sh
   ```
   Or manually with Docker:
   ```bash
   docker run -d \
     --name ai-app-template-redis \
     -p 6379:6379 \
     redis \
     redis-server --requirepass "redis-pw"
   ```

### Application Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

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

## 🗄️ Database Migrations with Drizzle

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

⚠️ **Warning**: This bypasses migration generation and should only be used in development.

## 🐳 Docker Configuration

### Using Docker Compose (Recommended)

The `docker-compose.yml` includes:
- PostgreSQL with pgvector
- Redis
- The Next.js application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

### Individual Container Management

**PostgreSQL:**
```bash
./start-database.sh
# or
docker run -d --name ai-app-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai-app-template -p 5432:5432 pgvector/pgvector:pg17
```

**Redis:**
```bash
./start-redis.sh
# or
docker run -d --name ai-app-redis -p 6379:6379 redis redis-server --requirepass "redis-pw"
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

Ensure these are set in production:
- `AUTH_SECRET` - Secure random string
- `DATABASE_URL` - Production database URL
- `REDIS_URL` - Production Redis URL
- `NODE_ENV=production`

### Docker Deployment

1. **Build and deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Run migrations**
   ```bash
   docker-compose exec app npm run db:migrate
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.
