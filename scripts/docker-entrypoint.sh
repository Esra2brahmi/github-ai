#!/usr/bin/env sh
set -e

# Wait for database if DATABASE_URL points to a service that's not ready yet
# Basic wait loop if Prisma migrate fails due to connection
RETRIES=10
until npx prisma migrate deploy; do
  RETRIES=$((RETRIES-1))
  if [ "$RETRIES" -le 0 ]; then
    echo "Prisma migrate deploy failed after multiple attempts"
    exit 1
  fi
  echo "Waiting for database to be ready... ($RETRIES retries left)"
  sleep 3
done

exec "$@"
