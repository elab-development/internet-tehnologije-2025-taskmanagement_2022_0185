import { NextResponse } from "next/server";
import { defineRouteContract, registerRouteContract } from "@/lib/openapi/contract";
import { okResponseSchema } from "@/lib/openapi/models";

const openApi = defineRouteContract({
  post: {
    summary: "Logout endpoint.",
    description: "Stateless JWT logout endpoint for client-side logout flow.",
    tags: ["Auth"],
    auth: "public",
    responses: [
      {
        status: 200,
        description: "Logout acknowledged.",
        schema: okResponseSchema
      }
    ]
  }
});

export async function POST() {
  return NextResponse.json({ ok: true });
}

registerRouteContract(openApi);



