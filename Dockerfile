# ── Build stage ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite picks up VITE_* from environment during build
ARG VITE_GATEWAY_URL
ARG VITE_API_BASE_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Production stage ──
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g serve@14
COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l $PORT"]
