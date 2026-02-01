const { execSync } = require("node:child_process");
const { loadTestEnv } = require("./load-test-env");
const { PrismaClient } = require("@prisma/client");

async function ensureTestSchema() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return;
  }
  let schema = null;
  try {
    const parsed = new URL(url);
    schema = parsed.searchParams.get("schema");
  } catch {
    schema = null;
  }

  if (!schema) {
    return;
  }

  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await prisma.$disconnect();
}

async function main() {
  loadTestEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL_TEST is not set. Create backend/.env.test first.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }

  await ensureTestSchema();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
