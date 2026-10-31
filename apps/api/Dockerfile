FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @nexus/api build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app ./

EXPOSE 4000
CMD ["pnpm", "--filter", "@nexus/api", "start"]

