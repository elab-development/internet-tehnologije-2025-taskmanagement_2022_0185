import { NextResponse } from "next/server";

export type ErrorShape = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonError(error: ApiError) {
  const payload: ErrorShape = {
    error: {
      code: error.code,
      message: error.message
    }
  };

  if (error.details !== undefined) {
    payload.error.details = error.details;
  }

  return NextResponse.json(payload, { status: error.status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err);
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      }
    },
    { status: 500 }
  );
}
