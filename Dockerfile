#build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.prod.json ./
COPY src ./src

ENV NODE_ENV=production

RUN npm run build

RUN npm prune --omit=dev

# run stage
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    RATE_LIMIT_WINDOW_MINUTES=15 \
    RATE_LIMIT_GENERAL_MAX=300 \
    RATE_LIMIT_AUTH_MAX=10 \
    JWT_ACCESS_EXPIRES_IN=15m \
    JWT_REFRESH_EXPIRES_IN_DAYS=7 \
    CORS_ORIGINS= \

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app

EXPOSE 3000

CMD ["node", "-r", "module-alias/register", "./dist/main.js"]
