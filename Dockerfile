# syntax=docker/dockerfile:1

FROM node:20-slim AS base

COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

FROM base AS build
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci
RUN npm run build

FROM gcr.io/distroless/nodejs20-debian11

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

WORKDIR /app

EXPOSE 3001

CMD [ "./dist/bootstrap.js" ]