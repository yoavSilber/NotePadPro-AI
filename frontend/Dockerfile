# Stage 1: build the Vite app into static files
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve the static files with nginx (tiny, fast)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA fallback: unknown paths serve index.html so React Router handles routing
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
