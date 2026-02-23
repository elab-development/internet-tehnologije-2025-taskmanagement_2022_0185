import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];
const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type";
const MAX_AGE_SECONDS = "86400";

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!rawOrigins) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Max-Age", MAX_AGE_SECONDS);
  response.headers.set("Vary", "Origin");
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && getAllowedOrigins().includes(origin) ? origin : null;

  if (request.method === "OPTIONS") {
    const preflightResponse = new NextResponse(null, { status: 204 });
    if (allowedOrigin) {
      applyCorsHeaders(preflightResponse, allowedOrigin);
    }
    return preflightResponse;
  }

  const response = NextResponse.next();
  if (allowedOrigin) {
    applyCorsHeaders(response, allowedOrigin);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"]
};
