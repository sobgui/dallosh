# ---- Build Stage ----
FROM node:20 AS builder
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./

# Configure npm with retry logic and better error handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

# Install dependencies with retry logic
RUN npm ci --no-audit --no-fund || npm ci --no-audit --no-fund || npm ci --no-audit --no-fund

# Check TypeScript version with retry
RUN npx tsc --version || npx tsc --version || npx tsc --version

COPY . .

RUN npm run build

# ---- Production Stage ----
FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 5005
ENV NODE_ENV=production
CMD ["node", "dist/main.js"] 