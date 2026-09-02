#!/bin/bash
# Production deployment script

echo "Running database migrations..."
npm run db:deploy

echo "Starting production server..."
npm run start
