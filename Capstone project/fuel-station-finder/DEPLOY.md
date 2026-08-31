# Deployment Guide — Neon + Railway

## Step 1: Set Up Neon PostgreSQL (Free Tier)

1. Go to [neon.tech](https://neon.tech) and sign up / log in
2. Click **Create Project**
   - Choose a project name: `fuelfinder`
   - Select a region closest to your users
   - Leave the default settings
3. On the project dashboard, click **Connection Details**
4. Copy the connection string — it looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this — you'll need it for Railway

## Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up / log in
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select your `fuel-station-finder` repository
4. Railway will detect the Dockerfile and start building

### Configure Environment Variables

In the Railway dashboard, go to your service → **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `DATABASE_SSL` | `true` |
| `PORT` | `3001` |

### Deploy

Railway will automatically deploy when you push to GitHub. Your API will be live at:
```
https://your-project-name.up.railway.app
```

## Step 3: Update Frontend

### Option A: Environment Variable (Recommended)

In your Vercel/frontend deployment, add:
```
VITE_API_URL=https://your-project-name.up.railway.app
```

### Option B: Vite Proxy (Local Development)

The `vite.config.js` already proxies `/api` to `localhost:3001` for local development.

## Step 4: Verify

1. Visit `https://your-project-name.up.railway.app/api/health`
   - Should return: `{"status":"ok","database":"connected"}`
2. Visit `https://your-project-name.up.railway.app/api/stations`
   - Should return the list of 10 seeded stations

## Local Development

```bash
# Terminal 1: Start the API server
cd server
cp .env.example .env
# Edit .env with your Neon connection string
node index.js

# Terminal 2: Start the frontend
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List stations (supports filters) |
| GET | `/api/stations/:id` | Get single station |
| POST | `/api/stations/:id/report` | Submit status report |
| GET | `/api/stations/:id/reports` | Get report history |
| POST | `/api/stations` | Create new station |
| GET | `/api/health` | Health check |

### Query Parameters

- `lat`, `lng` — User location (computes distance, sorts by nearest)
- `radius` — Max distance in km (requires lat/lng)
- `fuel_type` — `petrol` or `diesel`
- `status` — `has_fuel`, `out_of_stock`, `long_queue`
- `search` — Text search on name, brand, address
