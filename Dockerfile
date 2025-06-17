FROM alpine:3.20.3 AS build
WORKDIR /app
COPY package.json package-lock.json .
RUN apk add nodejs
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

FROM alpine:3.20.3 AS production
WORKDIR /app
RUN apk add --no-cache nodejs
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist

RUN echo '{"type": "module"}' > package.json
CMD ["node", "dist/src/bootstrap.js"]
