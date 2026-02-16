import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";
import { defineRouteContract, registerRouteContract } from "@/lib/openapi/contract";
import { errorResponseSchema, userSchema } from "@/lib/openapi/models";
import { z } from "zod";

const meResponseSchema = z.object({
  user: userSchema
});

const openApi = defineRouteContract({
  get: {
    summary: "Return currently authenticated user.",
    tags: ["Auth"],
    auth: "bearer",
    responses: [
      {
        status: 200,
        description: "Current authenticated user.",
        schema: meResponseSchema
      },
      {
        status: 401,
        description: "Unauthorized",
        schema: errorResponseSchema,
        errorCode: "UNAUTHORIZED"
      }
    ]
  }
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);



