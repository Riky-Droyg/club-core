# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ENV APP_ENV=local \
    APP_VERSION=docker-build \
    NEXT_OUTPUT=standalone \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-secret-with-at-least-32-characters \
    BETTER_AUTH_URL=http://localhost:3000 \
    EMAIL_PROVIDER=development
RUN npm run db:generate && npm run build

FROM deps AS migrate
WORKDIR /app
COPY prisma ./prisma
COPY prisma.config.ts package.json ./
COPY --from=builder /app/src/generated ./src/generated
CMD ["npm", "run", "db:deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
