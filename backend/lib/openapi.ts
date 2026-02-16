import { generateOpenApiDocument } from "@/docs/openapi";

export async function getOpenApiSpec(serverUrl: string) {
  return await generateOpenApiDocument(serverUrl);
}
