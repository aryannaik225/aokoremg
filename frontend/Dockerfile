FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Must be reachable from the browser, not from inside the container network,
# since the built bundle runs client-side — the backend's port is published
# to the host, so localhost:8000 is correct for docker-compose's default setup.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM node:20-slim

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh .
RUN npm install -g serve@14 && chmod +x docker-entrypoint.sh

EXPOSE 4173

ENTRYPOINT ["./docker-entrypoint.sh"]
