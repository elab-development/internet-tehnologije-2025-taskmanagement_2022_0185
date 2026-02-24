# Task Management Application

Full-stack task management application with:
- frontend UI for task/list/team management
- backend REST API (authentication, authorization, business logic)
- PostgreSQL database persistence

## Application overview

The application supports:
- user registration and login with JWT authentication
- personal and team task lists
- task CRUD with status/priority/due-date filters
- team management (members, roles, leave flow)
- generated API documentation via Swagger/OpenAPI
- optional email notifications for team invites (Brevo)

## Technologies used

Backend:
- Next.js App Router (Node runtime)
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod + `@asteasolutions/zod-to-openapi`
- JWT (`jsonwebtoken`) + password hashing (`bcrypt`)

Frontend:
- React + TypeScript
- Vite
- Tailwind CSS
- Google Charts (manual loader integration)

DevOps/Infra:
- Docker + Docker Compose
- GitHub Actions CI
- Render deployment (gated by CI checks)

## Environment setup

For Docker Compose, backend service reads env vars from root `/.env.example` via `env_file`.
In Docker-first setup, `DATABASE_URL` should point to Compose DB host (`db`):

```
DATABASE_URL=postgresql://postgres:postgres@db:5432/task_management
JWT_SECRET=change-me
```

If you run backend outside Docker, use a local env override with `localhost` DB host (for example in `backend/.env`).

Required variables:
- `DATABASE_URL`
- `JWT_SECRET`

Email variables (team invite notifications):
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME` (default: `Task App`)
- `BREVO_SANDBOX` (`true` or `false`, default: `false`)
- `CORS_ALLOWED_ORIGINS` (optional, comma-separated; default: `http://localhost:5173`)

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

Prerequisites:
- Node.js 20+
- PostgreSQL (local) or Dockerized DB

Start database (optional via Docker):

```
docker compose up -d db
```

Backend:

```
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Frontend (second terminal):

```
cd frontend
npm install
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

Docker Compose starts three services:
- `db` (PostgreSQL 16)
- `backend` (Next.js API, port `3000`)
- `frontend` (Vite dev server, port `5173`)

From repository root:

```
docker compose up --build -d
docker compose exec backend npx prisma db seed
```

Stop services:

```
docker compose down
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

## Security protections

The project covers multiple common attack categories with concrete protections:

1. IDOR / authorization checks
- Backend enforces ownership or team membership before returning/updating/deleting protected resources.
- Evidence:
  - `backend/lib/task-lists.ts` (`getTaskListOrThrow`)
  - `backend/lib/tasks.ts` (`getTaskOrThrow`)
  - `backend/lib/teams.ts` (`requireTeamMember`, `requireTeamOwner`)

2. SQL injection mitigation
- Data access uses Prisma ORM query builders (`findUnique`, `findMany`, `create`, `update`, `delete`, etc.) without raw SQL interpolation in API code.
- Evidence:
  - `backend/lib/prisma.ts` (single Prisma client entry point)
  - `backend/app/api/**/route.ts` and `backend/lib/**` Prisma usage

3. Input validation hardening
- Request body/query/params are parsed with Zod and rejected with consistent 400/422 API errors.
- Evidence:
  - `backend/lib/openapi/contract.ts` (`parseJsonBodyOrThrow`, `parseQueryOrThrow`, `parseParamsOrThrow`)
  - Route contracts in `backend/app/api/**/route.ts`

4. CORS allowlist (explicit)
- API responses now include CORS headers only for allowed origins, with constrained methods/headers.
- Configurable via `CORS_ALLOWED_ORIGINS`.
- Evidence:
  - `backend/middleware.ts`

5. XSS baseline on frontend
- React escapes interpolated values by default, and codebase does not use raw HTML rendering (`dangerouslySetInnerHTML`).
- Evidence:
  - `frontend/src/components/TaskCard.tsx` (task text rendered as JSX text nodes)

6. CSRF context
- Auth uses Bearer token in `Authorization` header (`backend/lib/auth.ts`), not cookie-session auth, which reduces classic browser CSRF surface.
- Note: HTTPS and strict token handling are still required in production.

## CI/CD (GitHub Actions + Render gating)

Workflow file: `.github/workflows/ci.yml` (name: `CI`)

CI runs automatically on:
- every `push`
- every `pull_request`

CI jobs (minimal smoke):
1. `frontend-build` (`npm ci` + `npm run build` in `frontend`)
2. `backend-build` (`npm ci` + `npm run build` in `backend`, with `JWT_SECRET=ci-secret`)
3. `backend-docker-build` (`docker build ./backend`, no image push)

Deployment model:
- Render remains the deployment layer.
- GitHub Actions does not trigger deploy directly.
- Configure Render to wait for successful GitHub checks before deploying.

Branch protection (`main`) recommendation:
1. Enable `Require status checks to pass before merging`.
2. Add required check: `CI`.
3. Optional: enable `Require branches to be up to date before merging`.

## Branching model

The project uses a standard Git branching strategy:

1. `main`
- stable production-ready version
- only reviewed and tested changes are merged here

2. `dev`
- integration branch for ongoing work
- feature branches are merged into `dev` before promoting to `main`

3. Example feature branches used in this project
- `feature/email-notification` (team invite email via Brevo)
- `feature/google-charts` (task status pie chart visualization)
- `feature/swagger` (runtime-generated OpenAPI + Swagger UI)

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
