FROM node:22-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --no-audit --no-fund


FROM node:22-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx next build


FROM node:22-slim AS run
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENV DROIDBOT_DB_PATH=/data/app.db
ENV DROIDBOT_UPLOADS_PATH=/data/uploads

# Next.js standalone production server
COPY --from=build /app/.next/standalone ./

# Static assets required by Next.js
COPY --from=build /app/.next/static ./.next/static

# Public assets
COPY --from=build /app/public ./public

# Startup wrapper
COPY --from=build /app/scripts ./scripts

VOLUME /data

EXPOSE 3000

CMD ["node", "scripts/start.mjs"]
