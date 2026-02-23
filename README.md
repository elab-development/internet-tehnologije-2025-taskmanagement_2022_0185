# Task Management Backend

Backend API for the Task Management App (Next.js App Router + Prisma + PostgreSQL + JWT).

## Environment setup

Copy the example env to the backend folder:

```
copy .env.example backend\.env
```

For Docker Compose, backend service loads env vars directly from root `.env.example` via `env_file`.
In Docker-first setup, `DATABASE_URL` in root `.env.example` should point to Compose DB host (`db`), e.g. `postgresql://postgres:postgres@db:5432/task_management`.
If you run backend outside Docker, use a local env override with `localhost` DB host.

Required variables:
- `DATABASE_URL`
- `JWT_SECRET`

Email variables (team invite notifications):
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME` (default: `Task App`)
- `BREVO_SANDBOX` (`true` or `false`, default: `false`)

When `BREVO_SANDBOX=true`, backend sends Brevo transactional requests with `X-Sib-Sandbox: drop`, so requests are validated by Brevo without actual delivery.
`BREVO_SENDER_EMAIL` must be a valid sender identity verified in your Brevo account.

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

Swagger UI:
```
http://localhost:3000/api/docs
```

OpenAPI JSON:
```
http://localhost:3000/api/openapi
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

Swagger UI:
```
http://localhost:3000/api/docs
```

OpenAPI JSON:
```
http://localhost:3000/api/openapi
```

## API docs (Swagger / OpenAPI)

OpenAPI is generated at runtime from co-located Zod schemas and `openApi` contracts defined directly in each API route file (`backend/app/api/**/route.ts`).  
Route discovery is auto-generated via `backend/scripts/generate-openapi-route-index.mjs` into `backend/.generated/openapi-route-index.ts`, so no manual central path/schema mapping file is maintained.

- Swagger UI URL: `http://localhost:3000/api/docs`
- OpenAPI JSON URL: `http://localhost:3000/api/openapi`

JWT in Swagger UI:
1. Call `POST /api/auth/login` and copy the `token` value.
2. Open Swagger UI and click `Authorize`.
3. Paste `Bearer <TOKEN>` and confirm.

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

## Team invite email notification

When team `OWNER` adds a member via `POST /api/teams/:teamId/members`, backend sends a Brevo transactional email with subject:
`Added to team: {teamName}`.

Email delivery is a side-effect: if Brevo call fails, member creation still succeeds and API response remains unchanged.

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
