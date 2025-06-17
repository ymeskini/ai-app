#!/usr/bin/env bash

# AI App Quick Start Script
# This script sets up and runs the entire application stack

set -e

echo "🚀 AI App Quick Start"
echo "===================="

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    echo "   Docker install guide: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose and try again."
    exit 1
fi

# Use docker-compose or docker compose based on availability
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Check if .env file exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please review and update it with your values."
    echo "   Continuing with default values for development..."
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "🐳 Starting services with Docker Compose..."
$DOCKER_COMPOSE_CMD up -d postgres redis

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🔍 Checking service health..."
if ! docker ps | grep -q "ai-app-postgres.*Up"; then
    echo "❌ PostgreSQL container is not running properly"
    $DOCKER_COMPOSE_CMD logs postgres
    exit 1
fi

if ! docker ps | grep -q "ai-app-redis.*Up"; then
    echo "❌ Redis container is not running properly"
    $DOCKER_COMPOSE_CMD logs redis
    exit 1
fi

echo "✅ Services are running!"

echo ""
echo "🗄️  Running database migrations..."
npm run db:migrate

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Available commands:"
echo "   • Start development server: npm run dev"
echo "   • View database: npm run db:studio"
echo "   • Stop services: $DOCKER_COMPOSE_CMD down"
echo "   • View logs: $DOCKER_COMPOSE_CMD logs -f"
echo ""
echo "🌐 Once you start the dev server, your app will be available at:"
echo "   http://localhost:3000"
echo ""
echo "💡 To start the development server now, run:"
echo "   npm run dev"
