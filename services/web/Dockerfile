# Build stage
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing if needed
# For now, use default which works for basic Vite builds
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
