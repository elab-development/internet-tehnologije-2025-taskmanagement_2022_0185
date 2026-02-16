import type { NextRequest } from "next/server";
import { z, type ZodTypeAny } from "zod";
import { ApiError } from "@/lib/api";

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

export type RouteRequestContract = {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
};

export type RouteResponseContract = {
  status: number;
  description: string;
  schema?: ZodTypeAny;
  errorCode?: string;
};

export type RouteMethodContract = {
  summary: string;
  description?: string;
  tags: string[];
  auth: "public" | "bearer";
  request?: RouteRequestContract;
  responses: RouteResponseContract[];
};

export type RouteContract = Partial<Record<HttpMethod, RouteMethodContract>>;

export function defineRouteContract<T extends RouteContract>(contract: T) {
  return contract;
}

type RegisteredRouteContract = {
  path: string;
  contract: RouteContract;
};

const routeContractRegistry = new Map<string, RouteContract>();
let currentRouteRegistrationPath: string | null = null;

function inferCallerFilePath() {
  const stack = new Error().stack;
  if (!stack) {
    return null;
  }

  for (const line of stack.split("\n")) {
    if (line.includes("registerRouteContract")) {
      continue;
    }

    const match = line.match(/([A-Za-z]:[^\s\)]+|\/[^\s\)]+)(?::\d+:\d+)?/);
    if (!match) {
      continue;
    }

    const filePath = match[1].replace(/\\/g, "/");
    if (filePath.includes("/app/api/") && /\/route\.(ts|js)$/.test(filePath)) {
      return filePath;
    }
  }

  return null;
}

function inferApiPathFromFilePath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/");
  const marker = "/app/api/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const routePart = normalized
    .slice(markerIndex + marker.length)
    .replace(/\/route\.(ts|js)$/, "");

  const segments = routePart
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith("[") && segment.endsWith("]")
        ? `{${segment.slice(1, -1)}}`
        : segment
    );

  return `/api/${segments.join("/")}`.replace(/\/+$/, "") || "/api";
}

export function registerRouteContract(contract: RouteContract) {
  let apiPath = currentRouteRegistrationPath;
  if (!apiPath) {
    const callerFilePath = inferCallerFilePath();
    if (callerFilePath) {
      apiPath = inferApiPathFromFilePath(callerFilePath);
    }
  }

  if (!apiPath) {
    return;
  }

  routeContractRegistry.set(apiPath, contract);
}

export function setRouteContractRegistrationPath(path: string | null) {
  currentRouteRegistrationPath = path;
}

export function getRegisteredRouteContracts(): RegisteredRouteContract[] {
  return Array.from(routeContractRegistry.entries())
    .map(([path, contract]) => ({ path, contract }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function zodErrorToValidationDetails(error: z.ZodError) {
  const details: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "body";
    if (!details[key]) {
      details[key] = issue.message;
    }
  }

  return details;
}

function parseOrThrow<T>(
  schema: z.ZodType<T>,
  value: unknown
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Validation error",
      zodErrorToValidationDetails(parsed.error)
    );
  }

  return parsed.data;
}

export async function parseJsonBodyOrThrow<T>(
  request: NextRequest,
  schema: z.ZodType<T>
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
  }

  return parseOrThrow(schema, body);
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const result: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

export function parseQueryOrThrow<T>(
  request: NextRequest,
  schema: z.ZodType<T>
) {
  return parseOrThrow(schema, searchParamsToObject(request.nextUrl.searchParams));
}

export function parseParamsOrThrow<T>(
  params: Record<string, unknown>,
  schema: z.ZodType<T>
) {
  return parseOrThrow(schema, params);
}
