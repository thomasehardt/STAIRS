# Build stage
FROM node:22-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Production stage
FROM nginxinc/nginx-unprivileged:stable-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files to the /stairs-docs path expected by the Astro config
COPY --from=build /app/dist /usr/share/nginx/html/stairs-docs

# Ensure proper permissions for the unprivileged user
USER root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
