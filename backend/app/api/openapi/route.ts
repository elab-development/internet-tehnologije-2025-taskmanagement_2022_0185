import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { getOpenApiSpec } from "@/lib/openapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const serverUrl = request.nextUrl.origin;
    const spec = await getOpenApiSpec(serverUrl);
    return NextResponse.json(spec);
  } catch (err) {
    console.error("Failed to generate OpenAPI spec", err);
    return handleApiError(err);
  }
}
