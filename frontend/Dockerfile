### Multi-stage Dockerfile for ShapeMint frontend + proxy server
### Stage 1: build the Vite React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy rest of the source and build
COPY . .
RUN npm run build

### Stage 2: production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy built static assets and proxy server
COPY --from=builder /app/dist ./dist
COPY proxy-server.js ./proxy-server.js

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "proxy-server.js"]
