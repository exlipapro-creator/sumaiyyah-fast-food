FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DROIDBOT_DB_PATH=/data/app.db
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/scripts ./scripts
VOLUME /data
EXPOSE 3000
# `npm start` runs scripts/start.mjs which injects a strong random
# DROIDBOT_SESSION_SECRET when one is not provided, so the app never falls back
# to a predictable/forgeable signing key. Set DROIDBOT_SESSION_SECRET explicitly
# for multi-instance or persistent-session deployments.
CMD ["npm", "start"]
