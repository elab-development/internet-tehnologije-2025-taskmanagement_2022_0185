import { describe, expect, it } from "vitest";
import { apiFetch } from "./helpers";

describe("openapi docs", () => {
  it("returns generated OpenAPI document with expected routes and security", async () => {
    const response = await apiFetch("/api/openapi");
    expect(response.status).toBe(200);
    expect(response.json).toBeTruthy();

    const document = response.json as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
      components?: {
        securitySchemes?: Record<string, unknown>;
        schemas?: Record<string, unknown>;
      };
    };

    expect(document.openapi).toBe("3.0.3");

    const requiredPaths = [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/me",
      "/api/task-lists",
      "/api/task-lists/{id}",
      "/api/tasks",
      "/api/tasks/{id}",
      "/api/teams",
      "/api/teams/{teamId}",
      "/api/teams/{teamId}/members",
      "/api/teams/{teamId}/members/{memberId}",
      "/api/teams/{teamId}/leave",
      "/api/health"
    ];

    for (const path of requiredPaths) {
      expect(document.paths[path]).toBeTruthy();
    }

    expect(document.paths["/api/openapi"]).toBeUndefined();
    expect(document.paths["/api/docs"]).toBeUndefined();
    expect(document.paths["/api/docs/assets/{file}"]).toBeUndefined();

    expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    });

    const loginPost = document.paths["/api/auth/login"]?.post as
      | { security?: unknown[] }
      | undefined;
    const registerPost = document.paths["/api/auth/register"]?.post as
      | { security?: unknown[] }
      | undefined;
    const logoutPost = document.paths["/api/auth/logout"]?.post as
      | { security?: unknown[] }
      | undefined;
    const meGet = document.paths["/api/auth/me"]?.get as
      | { security?: unknown[] }
      | undefined;

    expect(loginPost?.security).toBeUndefined();
    expect(registerPost?.security).toBeUndefined();
    expect(logoutPost?.security).toBeUndefined();
    expect(meGet?.security).toEqual([{ bearerAuth: [] }]);

    const errorResponseSchema = document.components?.schemas?.ErrorResponse as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(errorResponseSchema).toBeTruthy();
    expect(errorResponseSchema?.properties?.error).toBeTruthy();
  });

  it("serves Swagger UI HTML that points to /api/openapi", async () => {
    const response = await apiFetch("/api/docs");
    expect(response.status).toBe(200);
    expect(response.text).toContain("/api/openapi");
    expect(response.text).toContain("SwaggerUIBundle");
  });
});
