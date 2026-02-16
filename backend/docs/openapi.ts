import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import type {
  HttpMethod,
  RouteMethodContract,
  RouteResponseContract
} from "@/lib/openapi/contract";
import {
  getRegisteredRouteContracts,
  setRouteContractRegistrationPath
} from "@/lib/openapi/contract";
import { openApiRouteModules } from "@/.generated/openapi-route-index";

extendZodWithOpenApi(z);

export type OpenApiDocument = Record<string, unknown> & {
  servers?: Array<{ url: string }>;
};

const methods: HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head"
];

function buildResponse(response: RouteResponseContract) {
  if (!response.schema) {
    return { description: response.description };
  }

  const media: { schema: z.ZodTypeAny; example?: unknown } = {
    schema: response.schema
  };

  if (response.errorCode) {
    media.example = {
      error: {
        code: response.errorCode,
        message: response.description
      }
    };
  }

  return {
    description: response.description,
    content: {
      "application/json": media
    }
  };
}

function toPathResponseMap(responses: RouteMethodContract["responses"]) {
  const responseMap: Record<number, ReturnType<typeof buildResponse>> = {};
  for (const response of responses) {
    responseMap[response.status] = buildResponse(response);
  }
  return responseMap;
}

async function ensureRouteContractsLoaded() {
  for (const moduleEntry of openApiRouteModules) {
    setRouteContractRegistrationPath(moduleEntry.path);
    await moduleEntry.load();
  }
  setRouteContractRegistrationPath(null);
}

async function createBaseDocument() {
  await ensureRouteContractsLoaded();

  const registry = new OpenAPIRegistry();
  const errorResponseSchema = z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional()
    })
  });
  registry.register("ErrorResponse", errorResponseSchema);
  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT"
  });

  const routeContracts = getRegisteredRouteContracts();
  for (const route of routeContracts) {
    for (const method of methods) {
      const contract = route.contract[method];
      if (!contract) {
        continue;
      }

      const request: Record<string, unknown> = {};
      if (contract.request?.params) {
        request.params = contract.request.params as unknown;
      }
      if (contract.request?.query) {
        request.query = contract.request.query as unknown;
      }
      if (contract.request?.body) {
        request.body = {
          required: true,
          content: {
            "application/json": {
              schema: contract.request.body
            }
          }
        };
      }

      registry.registerPath({
        method,
        path: route.path,
        summary: contract.summary,
        description: contract.description,
        tags: contract.tags,
        security:
          contract.auth === "bearer" ? [{ bearerAuth: [] }] : undefined,
        request: Object.keys(request).length > 0 ? (request as any) : undefined,
        responses: toPathResponseMap(contract.responses)
      });
    }
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Task Management API",
      version: "1.0.0",
      description: "Auto-generated OpenAPI documentation from co-located route contracts."
    },
    servers: [{ url: "http://localhost:3000" }]
  }) as unknown as OpenApiDocument;
}

let cachedBaseDocumentPromise: Promise<OpenApiDocument> | null = null;

export async function generateOpenApiDocument(serverUrl: string): Promise<OpenApiDocument> {
  if (!cachedBaseDocumentPromise) {
    cachedBaseDocumentPromise = createBaseDocument();
  }

  const baseDocument = await cachedBaseDocumentPromise;

  return {
    ...baseDocument,
    servers: [{ url: serverUrl }]
  };
}
