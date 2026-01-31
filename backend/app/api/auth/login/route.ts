import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";
import { signToken, verifyPassword } from "@/lib/auth";
import { isNonEmpty, isValidEmail, normalizeEmail } from "@/lib/validation";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    let body: LoginBody;
    try {
      body = (await request.json()) as LoginBody;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Invalid JSON body");
    }
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const details: Record<string, string> = {};

    if (!isNonEmpty(rawEmail) || !isValidEmail(rawEmail)) {
      details.email = "Invalid email";
    }

    if (!isNonEmpty(password) || password.length < 8) {
      details.password = "Password must be at least 8 characters";
    }

    if (Object.keys(details).length > 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Validation error", details);
    }

    const email = normalizeEmail(rawEmail);
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
