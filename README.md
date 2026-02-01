# Task Management Backend

Backend API for the Task Management App (Next.js App Router + Prisma + PostgreSQL + JWT).

## Environment setup

Copy the example env to the backend folder:

```
copy .env.example backend\.env
```

Required variables:
- `DATABASE_URL`
- `JWT_SECRET`

## Test environment

A separate test schema is used by default. The repo includes `backend/.env.test`:

```
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/task_management?schema=test
JWT_SECRET_TEST=test-secret
```

If you run tests in Docker, override `DATABASE_URL_TEST` to use the `db` host:

```
docker compose exec -e DATABASE_URL_TEST=postgresql://postgres:postgres@db:5432/task_management?schema=test backend npm run test
```

## Local development

```
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Health check:
```
curl http://localhost:3000/api/health
```

## Docker

From repo root:

```
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

Health check:
```
curl http://localhost:3000/api/health
```

## Demo credentials (seed)

- `owner@example.com` / `password123`
- `member@example.com` / `password123`

## Quick API examples

Login:
```
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"owner@example.com\",\"password\":\"password123\"}"
```

List personal task lists:
```
curl -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/task-lists?scope=personal"
```

List tasks due soon:
```
curl -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/tasks?listId=<LIST_ID>&due=soon"
```

## Running tests

Local:
```
cd backend
npm run test
```

Docker:
```
docker compose exec -e DATABASE_URL_TEST=postgresql://postgres:postgres@db:5432/task_management?schema=test backend npm run test
```
