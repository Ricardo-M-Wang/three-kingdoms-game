FROM node:22-alpine

WORKDIR /app

# Install all dependencies (tsx needed to run TypeScript server)
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copy source and build frontend
COPY . .
RUN npx vite build

EXPOSE 3001

ENV API_PORT=3001
ENV NODE_ENV=production

CMD ["npx", "tsx", "server/index.ts"]
