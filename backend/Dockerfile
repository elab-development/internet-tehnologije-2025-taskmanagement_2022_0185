FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/task_management

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
