FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_audit=false npm_config_fund=false npm_config_update_notifier=false

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --ignore-scripts

COPY . .
RUN npm rebuild && npm run postinstall

EXPOSE 3000

CMD ["npm", "run", "dev"]
