# Backend Dockerfile
FROM node:20.18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci --workspace apps/api

# Copy source code
COPY apps/api ./apps/api
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client
WORKDIR /app/apps/api
RUN npm run prisma:generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:20.18-alpine

# Install OpenSSL and required libraries for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace apps/api --omit=dev

# Copy built files and Prisma schema
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy Prisma client - with npm workspaces, it's generated in root node_modules/.prisma
# We need to ensure @prisma/client is available, so copy the generated client
RUN mkdir -p ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]

