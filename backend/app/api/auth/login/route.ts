import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { signToken, verifyPassword } from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { z } from "zod";
import { defineRouteContract,
  registerRouteContract, parseJsonBodyOrThrow } from "@/lib/openapi/contract";
import { errorResponseSchema, userSchema } from "@/lib/openapi/models";

const loginBodySchema = z.object({
  email: z
    .string({ required_error: "Invalid email", invalid_type_error: "Invalid email" })
    .transform((value) => value.trim())
    .refine((value) => isValidEmail(value), "Invalid email"),
  password: z
    .string({
      required_error: "Password must be at least 8 characters",
      invalid_type_error: "Password must be at least 8 characters"
    })
    .refine((value) => value.length >= 8, "Password must be at least 8 characters")
});

const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema
});

const openApi = defineRouteContract({
  post: {
    summary: "Login and receive JWT token.",
    tags: ["Auth"],
    auth: "public",
    request: {
      body: loginBodySchema
    },
    responses: [
      {
        status: 200,
        description: "Login successful.",
        schema: loginResponseSchema
      },
      {
        status: 400,
        description: "Invalid JSON body",
        schema: errorResponseSchema,
        errorCode: "INVALID_JSON"
      },
      {
        status: 401,
        description: "Invalid credentials",
        schema: errorResponseSchema,
        errorCode: "INVALID_CREDENTIALS"
      },
      {
        status: 422,
        description: "Validation error",
        schema: errorResponseSchema,
        errorCode: "VALIDATION_ERROR"
      }
    ]
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBodyOrThrow(request, loginBodySchema);
    const email = normalizeEmail(body.email as string);
    const password = body.password as string;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        hashedPassword: true
      }
    });

    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const { hashedPassword, ...safeUser } = user;
    const token = signToken(user.id);

    return NextResponse.json({ token, user: safeUser });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




