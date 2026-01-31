import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { isNonEmpty, isOptionalNonEmpty, isValidEmail, normalizeEmail } from "@/lib/validation";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    let body: RegisterBody;
    try {
      body = (await request.json()) as RegisterBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;

    const details: Record<string, string> = {};

    if (!isNonEmpty(rawEmail) || !isValidEmail(rawEmail)) {
      details.email = "Invalid email";
    }

    if (!isNonEmpty(password) || password.length < 8) {
      details.password = "Password must be at least 8 characters";
    }

    if (!isOptionalNonEmpty(firstName)) {
      details.firstName = "First name must be at least 1 character";
    }

    if (!isOptionalNonEmpty(lastName)) {
      details.lastName = "Last name must be at least 1 character";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const email = normalizeEmail(rawEmail);
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
