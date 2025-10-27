# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV DEFAULT_WEATHER_CITY=北京

WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

VOLUME ["/app/data"]

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then(res => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1));"

CMD ["node", "server.js"]
