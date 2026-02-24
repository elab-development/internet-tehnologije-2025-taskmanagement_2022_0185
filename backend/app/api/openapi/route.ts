import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getOpenApiSpec } from "@/lib/openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolvePublicOrigin(request: NextRequest) {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers.get("host")?.split(",")[0]?.trim();

  const forwardedOrigin =
    forwardedProto && (forwardedHost || host)
      ? `${forwardedProto}://${forwardedHost || host}`
      : null;

  const fallbackOrigin = request.nextUrl.origin;
  const origin = forwardedOrigin ?? fallbackOrigin;

  return /^https?:\/\//i.test(origin) ? origin : fallbackOrigin;
}

export async function GET(request: NextRequest) {
  try {
    const serverUrl = resolvePublicOrigin(request);
    const spec = await getOpenApiSpec(serverUrl);
    return NextResponse.json(spec);
  } catch (err) {
    console.error("Failed to generate OpenAPI spec", err);
    return handleApiError(err);
  }
}
