# Backend-only Dockerfile for Cloud Run
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including optional for @insforge/sdk)
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/src/index.js"]
