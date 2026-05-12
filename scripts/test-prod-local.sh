#!/bin/bash

# A helper script to quickly build and run the production-like containers locally.
# This bypasses the need to push to GHCR and wait for CI.

# Use different names to avoid conflicts with bash read-only variables
HOST_UID=$(id -u)
HOST_GID=$(id -g)

echo "Building and starting production-like containers locally (UID: $HOST_UID, GID: $HOST_GID)..."

# We use the production images as names, but build them from local source
# We pass the UID/GID explicitly to the environment for docker-compose to pick up
UID=$HOST_UID GID=$HOST_GID docker-compose -f docker-compose.prod.yaml \
  -f - <<EOF up --build -d
services:
  api:
    build:
      context: .
      dockerfile: services/api/Dockerfile
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
