#!/usr/bin/env bash

# AI App Development Helper Script
# Common development tasks made easy

set -e

show_help() {
    echo "AI App Development Helper"
    echo "========================"
    echo ""
    echo "Usage: ./dev-helper.sh <command>"
    echo ""
    echo "Available commands:"
    echo "  setup           - Initial project setup"
    echo "  start           - Start all services"
    echo "  stop            - Stop all services"
    echo "  restart         - Restart all services"
    echo "  logs            - Show service logs"
    echo "  db:reset        - Reset database (careful!)"
    echo "  db:migrate      - Run database migrations"
    echo "  db:studio       - Open Drizzle Studio"
    echo "  db:generate     - Generate new migration"
    echo "  clean           - Clean up containers and volumes"
    echo "  test            - Run tests"
    echo "  lint            - Run linting"
    echo "  format          - Format code"
    echo "  help            - Show this help"
    echo ""
}

# Determine Docker Compose command
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

case "${1:-help}" in
    "setup"|"init")
        echo "🔧 Setting up development environment..."
        ./quick-start.sh
        ;;

    "start"|"up")
        echo "🚀 Starting all services..."
        $DOCKER_COMPOSE_CMD up -d
        echo "✅ Services started!"
        echo "   App: http://localhost:3000"
        echo "   PostgreSQL: localhost:5432"
        echo "   Redis: localhost:6379"
        ;;

    "stop"|"down")
        echo "🛑 Stopping all services..."
        $DOCKER_COMPOSE_CMD down
        echo "✅ Services stopped!"
        ;;

    "restart")
        echo "🔄 Restarting all services..."
        $DOCKER_COMPOSE_CMD restart
        echo "✅ Services restarted!"
        ;;

    "logs")
        echo "📋 Showing service logs..."
        $DOCKER_COMPOSE_CMD logs -f
        ;;

    "db:reset")
        echo "⚠️  This will destroy all data in the database!"
        read -p "Are you sure? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Resetting database..."
            $DOCKER_COMPOSE_CMD down -v
            $DOCKER_COMPOSE_CMD up -d postgres redis
            sleep 5
            npm run db:migrate
            echo "✅ Database reset complete!"
        else
            echo "❌ Database reset cancelled."
        fi
        ;;

    "db:migrate")
        echo "🗄️  Running database migrations..."
        npm run db:migrate
        echo "✅ Migrations complete!"
        ;;

    "db:studio")
        echo "🎨 Opening Drizzle Studio..."
        npm run db:studio
        ;;

    "db:generate")
        echo "📝 Generating new migration..."
        npm run db:generate
        echo "✅ Migration generated!"
        ;;

    "clean")
        echo "🧹 Cleaning up Docker containers and volumes..."
        $DOCKER_COMPOSE_CMD down -v --remove-orphans
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;

    "test")
        echo "🧪 Running tests..."
        npm test
        ;;

    "lint")
        echo "🔍 Running linter..."
        npm run lint
        ;;

    "format")
        echo "✨ Formatting code..."
        npm run format:write
        echo "✅ Code formatted!"
        ;;

    "help"|*)
        show_help
        ;;
esac
