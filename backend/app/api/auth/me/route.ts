import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
