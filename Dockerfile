FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
COPY README.md ./

RUN npm ci
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV WEB_DIST_DIR=/app/apps/web/dist

COPY --from=build /app/package.json /app/package-lock.json /app/tsconfig.base.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/packages ./packages

EXPOSE 8787

CMD ["node", "apps/server/dist/index.js"]
