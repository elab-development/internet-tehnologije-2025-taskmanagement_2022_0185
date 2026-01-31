import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

type TokenPayload = {
  sub: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, "SERVER_MISCONFIGURED", "JWT secret not configured");
  }
  return secret;
}

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function verifyPassword(value: string, hashed: string) {
  return bcrypt.compare(value, hashed);
}

export function signToken(userId: string) {
  const secret = getJwtSecret();
  return jwt.sign({ sub: userId } satisfies TokenPayload, secret, {
    expiresIn: "7d"
  });
}

export function verifyToken(token: string): TokenPayload {
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret);
  if (typeof payload === "string" || !payload.sub) {
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return { sub: payload.sub };
}

export async function requireAuthUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const payload = verifyToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return user;
}
