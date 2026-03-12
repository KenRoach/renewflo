# ── Build stage ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Railway passes env vars as Docker build args
# Vite reads VITE_* from environment at build time
ARG VITE_GATEWAY_URL=https://api-production-dcc6.up.railway.app
ARG VITE_API_BASE_URL=https://api-production-dcc6.up.railway.app/
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Production stage ──
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g serve@14
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
