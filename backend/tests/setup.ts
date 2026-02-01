import { afterAll, beforeAll, beforeEach } from "vitest";

// Load test env before importing any app modules.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadTestEnv } = require("../scripts/load-test-env");

loadTestEnv();

import {
  cleanupDb,
  disconnectDb,
  startTestServer,
  stopTestServer
} from "./helpers";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await startTestServer();
});

beforeEach(async () => {
  await cleanupDb();
});

afterAll(async () => {
  await cleanupDb();
  await stopTestServer();
  await disconnectDb();
});
