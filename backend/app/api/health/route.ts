import { NextResponse } from "next/server";
import { defineRouteContract, registerRouteContract } from "@/lib/openapi/contract";
import { okResponseSchema } from "@/lib/openapi/models";

const openApi = defineRouteContract({
  get: {
    summary: "Health check endpoint.",
    tags: ["Health"],
    auth: "public",
    responses: [
      {
        status: 200,
        description: "Backend is healthy.",
        schema: okResponseSchema
      }
    ]
  }
});

export function GET() {
  return NextResponse.json({ ok: true });
}

registerRouteContract(openApi);



