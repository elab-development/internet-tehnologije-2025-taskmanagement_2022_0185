import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { z } from "zod";
import { defineRouteContract,
  registerRouteContract, parseJsonBodyOrThrow } from "@/lib/openapi/contract";
import { errorResponseSchema, userSchema } from "@/lib/openapi/models";

const registerBodySchema = z.object({
  email: z
    .string({ required_error: "Invalid email", invalid_type_error: "Invalid email" })
    .transform((value) => value.trim())
    .refine((value) => isValidEmail(value), "Invalid email"),
  password: z
    .string({
      required_error: "Password must be at least 8 characters",
      invalid_type_error: "Password must be at least 8 characters"
    })
    .refine((value) => value.length >= 8, "Password must be at least 8 characters"),
  firstName: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : undefined))
    .refine(
      (value) => value === undefined || value.length > 0,
      "First name must be at least 1 character"
    ),
  lastName: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : undefined))
    .refine(
      (value) => value === undefined || value.length > 0,
      "Last name must be at least 1 character"
    )
});

const registerResponseSchema = z.object({
  user: userSchema
});

const openApi = defineRouteContract({
  post: {
    summary: "Register a new user account.",
    tags: ["Auth"],
    auth: "public",
    request: {
      body: registerBodySchema
    },
    responses: [
      {
        status: 201,
        description: "User registered.",
        schema: registerResponseSchema
      },
      {
        status: 400,
        description: "Invalid JSON body",
        schema: errorResponseSchema,
        errorCode: "INVALID_JSON"
      },
      {
        status: 409,
        description: "Email already in use",
        schema: errorResponseSchema,
        errorCode: "EMAIL_IN_USE"
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
    const body = await parseJsonBodyOrThrow(request, registerBodySchema);
    const email = normalizeEmail(body.email as string);
    const password = body.password as string;
    const firstName = body.firstName as string | undefined;
    const lastName = body.lastName as string | undefined;
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new ApiError(409, "EMAIL_IN_USE", "Email already in use");
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        firstName: firstName ?? null,
        lastName: lastName ?? null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

registerRouteContract(openApi);




