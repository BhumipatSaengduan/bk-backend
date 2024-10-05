FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./

RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts /app/tsconfig.json /app/package*.json ./

RUN mkdir -p /app/uploads

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
