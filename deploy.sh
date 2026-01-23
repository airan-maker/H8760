#!/bin/bash
# Hydrogen Platform Deployment Script

set -e

echo "=========================================="
echo "Hydrogen Platform Deployment"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Function to display usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev       - Start development environment"
    echo "  prod      - Start production environment"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart all services"
    echo "  logs      - Show logs"
    echo "  backup    - Backup database"
    echo "  restore   - Restore database from backup"
    echo "  clean     - Remove all containers and volumes"
    echo ""
}

# Development mode
dev() {
    echo "Starting development environment..."
    docker-compose up -d --build
    echo ""
    echo "Services started:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend:  http://localhost:8000"
    echo "  - API Docs: http://localhost:8000/docs"
}

# Production mode
prod() {
    echo "Starting production environment..."
    docker-compose -f docker-compose.prod.yml up -d --build
    echo ""
    echo "Services started:"
    echo "  - Frontend: http://localhost (port 80)"
    echo "  - Backend:  http://localhost:8000"
}

# Stop services
stop() {
    echo "Stopping services..."
    docker-compose down
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
}

# Restart services
restart() {
    stop
    if [ "$1" == "prod" ]; then
        prod
    else
        dev
    fi
}

# Show logs
logs() {
    docker-compose logs -f
}

# Backup database
backup() {
    BACKUP_FILE="backup/hydrogen_$(date +%Y%m%d_%H%M%S).sql"
    echo "Creating backup: $BACKUP_FILE"
    mkdir -p backup
    docker-compose exec -T db pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE
    echo "Backup completed: $BACKUP_FILE"
}

# Restore database
restore() {
    if [ -z "$1" ]; then
        echo "Usage: $0 restore <backup_file>"
        exit 1
    fi
    echo "Restoring from: $1"
    docker-compose exec -T db psql -U $DB_USER $DB_NAME < $1
    echo "Restore completed"
}

# Clean all
clean() {
    echo "WARNING: This will remove all containers and volumes!"
    read -p "Are you sure? (y/N) " confirm
    if [ "$confirm" == "y" ] || [ "$confirm" == "Y" ]; then
        docker-compose down -v
        docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
        echo "Cleanup completed"
    else
        echo "Cancelled"
    fi
}

# Main
case "$1" in
    dev)
        dev
        ;;
    prod)
        prod
        ;;
    stop)
        stop
        ;;
    restart)
        restart $2
        ;;
    logs)
        logs
        ;;
    backup)
        backup
        ;;
    restore)
        restore $2
        ;;
    clean)
        clean
        ;;
    *)
        usage
        ;;
esac
