# ---------- Base ----------
ARG NODE_VERSION=20.20.0
FROM node:${NODE_VERSION}-bookworm AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---------- Builder ----------
FROM node:${NODE_VERSION}-bookworm AS builder
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Compilar NestJS
RUN npm run build

# Instalar solo dependencias producción
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Runner ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# 🔥 Instalar OpenSSL (FALTABA ESTO)
RUN apt-get update -y && apt-get install -y openssl

# Copiar artefactos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# 🔥 Dar permisos al usuario node
RUN chown -R node:node /app

EXPOSE 3000

USER node

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]