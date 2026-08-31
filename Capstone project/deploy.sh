#!/bin/bash
set -e

echo "⛽ FuelFinder Deployment Script"
echo "================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if .env exists in server/
if [ ! -f server/.env ]; then
    echo ""
    echo "⚠️  No server/.env file found."
    echo "   Create one from the template:"
    echo ""
    echo "   cp server/.env.example server/.env"
    echo ""
    echo "   Then paste your Neon connection string:"
    echo "   DATABASE_URL=postgresql://neondb_owner:xxxx@ep-xxx.neon.tech/neondb?sslmode=require"
    echo ""
    exit 1
fi

# Source the env file
source server/.env

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in server/.env"
    exit 1
fi

echo "✅ Found DATABASE_URL"
echo ""

# Login to Railway if needed
if ! railway whoami &> /dev/null; then
    echo "🔐 Logging in to Railway..."
    railway login
fi

# Link or create project
echo "🔗 Linking Railway project..."
railway link 2>/dev/null || railway init

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set DATABASE_SSL="true"

# Deploy
echo ""
echo "🚀 Deploying to Railway..."
railway up --service fuelfinder-api

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Check your deployment:"
railway status
echo ""
echo "🌐 View logs:"
railway logs
