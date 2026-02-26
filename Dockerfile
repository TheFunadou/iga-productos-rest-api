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

# Generar cliente de Prisma
RUN npx prisma generate

# Compilar NestJS
RUN npm run build

# Instalar solo dependencias de producción
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Runner ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar artefactos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Exponer puerto (Nest default)
EXPOSE 3000

# Usuario no root
USER node

# Comando de inicio
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]