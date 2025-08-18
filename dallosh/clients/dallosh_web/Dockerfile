# ---- Build Stage ----
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install --legacy-peer-deps -f
COPY . .
RUN npm run build -- --no-lint

# ---- Production Stage ----
FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.* ./

EXPOSE 3005
ENV NODE_ENV=production
CMD ["npm", "run", "start"] 