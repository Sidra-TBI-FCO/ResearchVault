FROM node:20-alpine

# postgresql-client provides pg_isready for the entrypoint health check
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Install all dependencies (including devDependencies for drizzle-kit migrations)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy full source
COPY . .

# Build frontend (Vite → dist/public) and backend (esbuild → dist/index.js)
RUN npm run build

# Persistent volume mount point for uploaded files
RUN mkdir -p /data/uploads

EXPOSE 5000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
