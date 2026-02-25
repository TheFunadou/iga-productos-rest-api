# Dockerfile
ARG NODE_VERSION=20.20.0

FROM node:${NODE_VERSION}-bookworm AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:${NODE_VERSION}-bookworm AS builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
RUN npm run build
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

FROM node:${NODE_VERSION}-bookworm AS runner
WORKDIR /app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
USER node
CMD ["node", "dist/main.js"]