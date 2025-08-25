FROM node:22.11.0-alpine AS base
 
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_PORT 3000
RUN corepack install --global pnpm@9.9.0
RUN corepack enable

FROM base AS dependencies

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN pnpm build
# RUN pnpm run db:generate
RUN pnpm prune --prod --config.ignore-scripts=true

FROM base AS deploy

WORKDIR /app
COPY --from=build /app/dist/ ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

EXPOSE 3000

# Run the application in production mode
CMD ["pnpm", "start:prod"]
