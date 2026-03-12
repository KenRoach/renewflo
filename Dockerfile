# ── Build stage ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite picks up VITE_* env vars during build
ARG VITE_GATEWAY_URL
ARG VITE_API_BASE_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ── Production stage ──
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# nginx:alpine supports envsubst via /etc/nginx/templates/*.template
# It auto-substitutes $PORT and writes to /etc/nginx/conf.d/

ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
