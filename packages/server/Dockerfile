FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- deps stage ---
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
# Install all deps (including devDeps) so typescript is available for build
RUN pnpm install --frozen-lockfile

# --- build stage ---
FROM deps AS build
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN pnpm --filter @go-stop/shared build
RUN pnpm --filter @go-stop/server build

# --- runtime stage ---
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/server/dist ./packages/server/dist
RUN pnpm install --frozen-lockfile --prod --filter @go-stop/server...

EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
