FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --production

# Copy server code
COPY server/ .

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
