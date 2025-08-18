FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install --legacy-peer-deps -f

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3003
ENV NODE_ENV=production

CMD ["npm", "run", "start"] 