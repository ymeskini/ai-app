#!/bin/bash
# Enables the pgvector extension and pushes the schema to the database.
# Run this once after starting the Docker services for the first time,
# or after resetting the database.

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:password@localhost:5432/ai-app-template}"

echo "Enabling pgvector extension..."
PGPASSWORD=$(echo "$DATABASE_URL" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|') \
  psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "Pushing schema..."
npm run db:push

echo "Done."
