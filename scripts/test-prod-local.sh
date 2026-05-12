#!/bin/bash

# A helper script to quickly build and run the production-like containers locally.
# This bypasses the need to push to GHCR and wait for CI.

export UID=$(id -u)
export GID=$(id -g)

echo "Building and starting production-like containers locally..."

# We use the production images as names, but build them from local source
docker compose -f docker-compose.prod.yaml \
  -f - <<EOF up --build -d
services:
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile
  web:
    build:
      context: ./services/web
      dockerfile: Dockerfile
  cli:
    build:
      context: ./services/cli
      dockerfile: Dockerfile
EOF

echo "Done! The production-like stack is running at http://localhost:3000"
