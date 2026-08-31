# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend

WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source and build
COPY index.html vite.config.js ./
COPY src/ src/
COPY public/ public/
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --production

# Copy server code
COPY server/ .

# Copy built frontend from stage 1
COPY --from=frontend /app/dist ./public

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
