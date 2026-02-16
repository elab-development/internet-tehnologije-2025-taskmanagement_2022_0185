import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const apiRoot = path.join(projectRoot, "app", "api");
const generatedDir = path.join(projectRoot, ".generated");
const outputFile = path.join(generatedDir, "openapi-route-index.ts");

async function collectRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name === "route.ts") {
      files.push(absolutePath);
    }
  }

  return files;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function segmentToOpenApi(segment) {
  if (segment.startsWith("[") && segment.endsWith("]")) {
    return `{${segment.slice(1, -1)}}`;
  }
  return segment;
}

function toApiPath(routeFile) {
  const routeDir = path.dirname(routeFile);
  const relativeDir = path.relative(apiRoot, routeDir);
  const segments = relativeDir === "" ? [] : relativeDir.split(path.sep);
  const apiSegments = segments.map(segmentToOpenApi);
  return `/api/${apiSegments.join("/")}`.replace(/\/+$/, "") || "/api";
}

function isIncludedApiPath(apiPath) {
  if (apiPath === "/api/openapi") {
    return false;
  }

  if (apiPath === "/api/docs" || apiPath.startsWith("/api/docs/")) {
    return false;
  }

  return true;
}

function toImportPath(routeFile) {
  const relativePath = toPosix(path.relative(generatedDir, routeFile));
  const withoutExtension = relativePath.replace(/\.ts$/, "");
  if (withoutExtension.startsWith(".")) {
    return withoutExtension;
  }
  return `./${withoutExtension}`;
}

async function main() {
  const routeFiles = await collectRouteFiles(apiRoot);
  const entries = routeFiles
    .map((routeFile) => ({
      routeFile,
      apiPath: toApiPath(routeFile)
    }))
    .filter((entry) => isIncludedApiPath(entry.apiPath))
    .sort((a, b) => {
      if (a.apiPath !== b.apiPath) {
        return a.apiPath.localeCompare(b.apiPath);
      }
      return a.routeFile.localeCompare(b.routeFile);
    });

  const moduleEntries = entries.map(
    (entry) =>
      `  { path: ${JSON.stringify(entry.apiPath)}, load: async () => import(${JSON.stringify(
        toImportPath(entry.routeFile)
      )}) }`
  );

  const content = `export const openApiRouteModules = [
${moduleEntries.join(",\n")}
] as const;
`;

  await mkdir(generatedDir, { recursive: true });
  await writeFile(outputFile, content, "utf8");

  console.log(`Generated ${path.relative(projectRoot, outputFile)} with ${entries.length} route contracts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
