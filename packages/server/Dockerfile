FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- deps stage ---
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

# --- build stage ---
FROM deps AS build
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN pnpm --filter @go-stop/shared build
RUN pnpm --filter @go-stop/server build
# Create standalone production bundle (resolves workspace deps automatically)
RUN pnpm --filter @go-stop/server deploy --prod /deploy

# --- runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /deploy .
EXPOSE 3000
CMD ["node", "dist/index.js"]
