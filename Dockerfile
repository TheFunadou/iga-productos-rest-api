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
# PASO CLAVE: Generar el cliente de Prisma
RUN npx prisma generate
RUN npm run build
ENV NODE_ENV=PROD
RUN npm ci --omit=dev && npm cache clean --force

FROM node:${NODE_VERSION}-bookworm AS runner
WORKDIR /app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
# También necesitas la carpeta generated en tiempo de ejecución
COPY --from=builder --chown=node:node /app/generated ./generated
USER node
CMD ["node", "dist/main.js"]