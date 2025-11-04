### Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
COPY .npmrc ./
RUN npm ci --silent || npm install --silent

COPY . .
RUN npm run build

### Production stage
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Remove default nginx config and add a minimal one that serves static files
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
